const crypto = require('crypto');
function hashPassword(password, salt) {
  return crypto.createHash('sha256').update(password + salt).digest('hex');
}
const salt = 'q9Y7tK1sXb4Fv2cM';
const password = 'admin'; // Assuming admin/admin for now
console.log('Hash for admin/admin:', hashPassword(password, salt));
