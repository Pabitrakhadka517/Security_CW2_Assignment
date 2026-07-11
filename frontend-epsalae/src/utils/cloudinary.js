/**
 * Simple image upload utility - converts image to base64 URL
 */

export const openCloudinaryWidget = (config, callback) => {
  return new Promise((resolve, reject) => {
    // Create a hidden file input
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';

    input.onchange = (e) => {
      const file = e.target.files?.[0];
      if (!file) {
        reject(new Error('No file selected'));
        return;
      }

      console.log('📁 File selected:', file.name, `(${(file.size / 1024).toFixed(2)}KB)`);

      // Read file as base64
      const reader = new FileReader();
      reader.onload = (event) => {
        const base64Url = event.target?.result;
        console.log('✅ Image converted to base64');
        
        // Simulate success response
        callback(null, {
          event: 'success',
          info: {
            secure_url: base64Url,
            public_id: file.name,
            format: file.type,
          }
        });
        resolve();
      };

      reader.onerror = (error) => {
        console.error('❌ Error reading file:', error);
        callback(error, null);
        reject(error);
      };

      reader.readAsDataURL(file);
    };

    input.onerror = (error) => {
      console.error('❌ File input error:', error);
      reject(error);
    };

    // Trigger file picker
    console.log('🖼️ Opening file picker...');
    input.click();
  });
};


