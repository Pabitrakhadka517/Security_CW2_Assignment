import swaggerJSDoc from 'swagger-jsdoc';
import fs from 'fs';
import path from 'path';
import { logger } from './utils/logger';

const port = process.env.PORT || 5000;
const isProd = (process.env.NODE_ENV || 'development') === 'production';
const apiBase = process.env.API_BASE || `http://localhost:${port}/api/v1`;

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Epasaley E-Commerce API',
      version: '1.0.0',
      description: 'OpenAPI (Swagger) documentation for Epasaley e-commerce backend',
    },
    servers: [
      {
        url: apiBase,
        description: isProd ? 'Production server' : 'Local server',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
    },
    security: [
      {
        bearerAuth: [],
      },
    ],
  },
  // Path to the API docs - we use routes and controllers for JSDoc annotations
  apis: ['./src/routes/*.ts', './src/controllers/*.ts'],
};

const swaggerSpec: any = swaggerJSDoc(options);

// Optional refined auto-generation of minimal path entries from route files.
// Controlled by `SWAGGER_AUTO_GEN=true`. Default: enabled in non-production
// so running `npm run dev` will auto-generate minimal paths if JSDoc is missing.
const enableAutoGen = process.env.SWAGGER_AUTO_GEN === 'true' || ((process.env.NODE_ENV || 'development') !== 'production');
if (enableAutoGen) {
  try {
    const routesDir = path.resolve(__dirname, 'routes');
    const indexFile = path.resolve(routesDir, 'index.ts');

    const indexSrc = fs.existsSync(indexFile) ? fs.readFileSync(indexFile, 'utf8') : '';
    const importRegex = /import\s+(\w+)\s+from\s+['"](.\/[^'";]+)['"]/g;
    const useRegex = /router\.use\(\s*['"]([^'"\)]+)['"]\s*,\s*(\w+)\s*\)/g;

    const varToFile: Record<string, string> = {};
    let m: RegExpExecArray | null;
    while ((m = importRegex.exec(indexSrc))) {
      const varName = m[1];
      const relPath = m[2];
      varToFile[varName] = path.resolve(routesDir, relPath + (relPath.endsWith('.ts') ? '' : '.ts'));
    }

    const fileToMount: Record<string, string> = {};
    while ((m = useRegex.exec(indexSrc))) {
      const mountPath = m[1];
      const varName = m[2];
      const filePath = varToFile[varName];
      if (filePath) fileToMount[filePath] = mountPath;
    }

    const routeFiles = fs.existsSync(routesDir) ? fs.readdirSync(routesDir) : [];
    routeFiles.forEach((file) => {
      const fullPath = path.resolve(routesDir, file);
      if (!fullPath.endsWith('.ts')) return;
      const src = fs.readFileSync(fullPath, 'utf8');
      const routeRegex = /router\.(get|post|put|delete|patch)\s*\(\s*['"]([^'"\)]+)['"]/g;
      let rm: RegExpExecArray | null;
      const mount = fileToMount[fullPath] || '';
      while ((rm = routeRegex.exec(src))) {
        const method = rm[1].toLowerCase();
        const routePath = rm[2];
        const normalized = path.posix.join(mount, routePath).replace(/\\/g, '/');
        const openapiPath = normalized.startsWith('/') ? normalized : '/' + normalized;

        if (!swaggerSpec.paths) swaggerSpec.paths = {};
        if (!swaggerSpec.paths[openapiPath]) swaggerSpec.paths[openapiPath] = {};

        if (!swaggerSpec.paths[openapiPath][method]) {
          const tag = (openapiPath.split('/')[1] || 'default');
          swaggerSpec.paths[openapiPath][method] = {
            tags: [tag],
            summary: 'Auto-generated route',
            description: 'Automatically added from route file; replace with JSDoc for richer docs.',
            responses: {
              '200': { description: 'Successful response' },
              '400': { description: 'Bad request' },
              '401': { description: 'Unauthorized' },
              '404': { description: 'Not found' },
            },
          } as any;
        }
      }
    });
  } catch (err) {
    logger.warn('Warning: could not auto-generate swagger paths:', (err as any)?.message ?? String(err));
  }
}

/**
 * Enhance swaggerSpec by merging schemas converted from Joi validation files
 * This provides form fields and request/response shapes in Swagger UI.
 */
try {
  // joi-to-swagger converts Joi schemas to OpenAPI-compatible schemas
  // require dynamically to avoid breaking builds if package isn't installed
  // (it's added to package.json and installed by the dev workflow)
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const joiToSwagger = require('joi-to-swagger');

  const validationsDir = path.resolve(__dirname, 'validations');
  if (fs.existsSync(validationsDir)) {
    const files = fs.readdirSync(validationsDir).filter((f) => f.endsWith('.ts') || f.endsWith('.js'));
    const validations: Record<string, any> = {};

    files.forEach((file) => {
      try {
        // import validation module (ts-node allows requiring .ts during dev)
        const modPath = path.resolve(validationsDir, file);
        // attempt to require compiled .js first if present
        let mod = null;
        try { mod = require(modPath); } catch (e) {
          // try requiring without extension
          try { mod = require(modPath.replace(/\.ts$/, '.js')); } catch (e2) {
            // last resort: transpile via ts-node (should be available in dev)
            mod = require(modPath);
          }
        }

        const base = file.replace(/\.validation\.(ts|js)$/, '').replace(/\.ts$/, '').replace(/\.js$/, '');
        validations[base] = mod;
      } catch (e) {
        // ignore individual validation load failures
      }
    });

    // helper to detect Joi schema
    const isJoi = (s: any) => s && typeof s.describe === 'function';

    // iterate swagger paths and try to attach parameters/requestBody
    Object.keys(swaggerSpec.paths || {}).forEach((p) => {
      const pathObj = swaggerSpec.paths[p];
      // deduce module name from path: '/products/...' -> 'product' (singular)
      const parts = p.split('/').filter(Boolean);
      const tag = parts[0] || '';
      const baseName = tag.endsWith('s') ? tag.slice(0, -1) : tag;
      const v = validations[baseName] || validations[tag] || validations[baseName + 's'];
      if (!v) return;

      // find schemas in validation module
      const findSchema = (predicate: (key: string, val: any) => boolean) => {
        for (const k of Object.keys(v)) {
          try {
            const val = v[k];
            if (val && typeof val === 'object') {
              if (predicate(k, val)) return { key: k, val };
            }
          } catch (e) {}
        }
        return null;
      };

      // for common operations map heuristics
      Object.keys(pathObj).forEach((method) => {
        const op = pathObj[method];

        // Attach query parameters from get*Query schemas
        if (method.toLowerCase() === 'get') {
          // list endpoints usually end with '/' or not have :id
          if (!p.match(':')) {
            const q = findSchema((k) => /query/i.test(k) || /get.*query/i.test(k));
            if (q && q.val.query && isJoi(q.val.query)) {
              const { swagger } = joiToSwagger(q.val.query);
              // convert properties into parameters
              op.parameters = op.parameters || [];
              const props = swagger.properties || {};
              Object.keys(props).forEach((name) => {
                op.parameters.push({ name, in: 'query', schema: props[name], required: (swagger.required || []).includes(name) });
              });
            }
          } else {
            // get by id -> params
            const psch = findSchema((k,val) => (val.params && isJoi(val.params)) || /get.*by.*id/i.test(k) || /get.*by.*id/i.test(k));
            if (psch && psch.val.params && isJoi(psch.val.params)) {
              const { swagger } = joiToSwagger(psch.val.params);
              op.parameters = op.parameters || [];
              const props = swagger.properties || {};
              Object.keys(props).forEach((name) => {
                op.parameters.push({ name, in: 'path', schema: props[name], required: true });
              });
            }
          }
        }

        // POST -> create body
        if (method.toLowerCase() === 'post') {
          const create = findSchema((k, val) => /create/i.test(k) && val.body && isJoi(val.body));
          if (create && create.val.body && isJoi(create.val.body)) {
            const { swagger } = joiToSwagger(create.val.body);
            op.requestBody = op.requestBody || { content: { 'application/json': { schema: {} } } };
            op.requestBody.content['application/json'].schema = swagger;
          }
        }

        // PUT -> update body and params
        if (method.toLowerCase() === 'put' || method.toLowerCase() === 'patch') {
          const update = findSchema((k, val) => /update/i.test(k) && ( (val.body && isJoi(val.body)) || (val.params && isJoi(val.params)) ));
          if (update) {
            if (update.val.params && isJoi(update.val.params)) {
              const { swagger } = joiToSwagger(update.val.params);
              op.parameters = op.parameters || [];
              const props = swagger.properties || {};
              Object.keys(props).forEach((name) => {
                op.parameters.push({ name, in: 'path', schema: props[name], required: true });
              });
            }
            if (update.val.body && isJoi(update.val.body)) {
              const { swagger } = joiToSwagger(update.val.body);
              op.requestBody = op.requestBody || { content: { 'application/json': { schema: {} } } };
              op.requestBody.content['application/json'].schema = swagger;
            }
          }
        }
      });
    });
  }
} catch (err) {
  // non-fatal
  logger.warn('Could not enrich swagger spec from Joi validations:', (err as any)?.message ?? String(err));
}

// Remove any auto-generated operations if present.
// This ensures the Swagger document only contains explicitly documented routes
// (via JSDoc) unless the `SWAGGER_AUTO_GEN` mode was intentionally enabled.
try {
  if (swaggerSpec.paths) {
    Object.keys(swaggerSpec.paths).forEach((p) => {
      const ops = swaggerSpec.paths![p] as Record<string, any>;
      Object.keys(ops).forEach((m) => {
        const op = ops[m];
        const summary: string = (op && op.summary) || '';
        const desc: string = (op && op.description) || '';
        if (summary.toLowerCase().includes('auto-generated') || desc.toLowerCase().includes('automatically added')) {
          // delete this operation
          delete ops[m];
        }
      });
      // if no operations remain for this path, remove the path entry
      if (!Object.keys(ops).length) delete swaggerSpec.paths![p];
    });
  }
} catch (e) {
  logger.warn('Could not prune auto-generated swagger operations:', (e as any)?.message ?? String(e));
}

export default swaggerSpec;
