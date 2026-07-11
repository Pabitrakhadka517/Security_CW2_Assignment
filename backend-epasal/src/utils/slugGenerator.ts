/**
 * Generate URL-friendly slug from text
 * Example: "Hello World!" -> "hello-world"
 */
export const generateSlug = (text: string): string => {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '') // Remove special characters
    .replace(/[\s_-]+/g, '-') // Replace spaces and underscores with single dash
    .replace(/^-+|-+$/g, ''); // Remove leading/trailing dashes
};

/**
 * Generate unique slug by appending timestamp if needed
 */
export const generateUniqueSlug = (text: string, addTimestamp: boolean = false): string => {
  const baseSlug = generateSlug(text);
  
  if (addTimestamp) {
    const timestamp = Date.now().toString(36); // Convert to base36 for shorter string
    return `${baseSlug}-${timestamp}`;
  }
  
  return baseSlug;
};

/**
 * Validate if slug is valid
 */
export const isValidSlug = (slug: string): boolean => {
  const slugRegex = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
  return slugRegex.test(slug);
};
