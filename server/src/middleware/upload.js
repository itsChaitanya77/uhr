const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const multer = require('multer');

const UPLOAD_DIR = path.join(__dirname, '..', '..', 'uploads');
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const ALLOWED = {
  'application/pdf': { ext: '.pdf', magic: [0x25, 0x50, 0x44, 0x46] },
  'image/png': { ext: '.png', magic: [0x89, 0x50, 0x4e, 0x47] },
  'image/jpeg': { ext: '.jpg', magic: [0xff, 0xd8, 0xff] },
};
const MAX_BYTES = 5 * 1024 * 1024;

const upload = multer({
  storage: multer.diskStorage({
    destination: UPLOAD_DIR,
    // Random server-side name: the client-supplied filename never touches the disk path.
    filename: (_req, file, cb) => cb(null, crypto.randomBytes(16).toString('hex') + (ALLOWED[file.mimetype]?.ext || '')),
  }),
  limits: { fileSize: MAX_BYTES, files: 1 },
  fileFilter: (_req, file, cb) => {
    if (!ALLOWED[file.mimetype]) return cb(new Error('Only PDF, PNG and JPEG files are allowed'));
    cb(null, true);
  },
});

/** After multer: confirm the file's leading bytes match the declared type (not just the extension). */
function verifyMagicBytes(req, res, next) {
  if (!req.file) return next();
  const { magic } = ALLOWED[req.file.mimetype];
  const fd = fs.openSync(req.file.path, 'r');
  const buf = Buffer.alloc(magic.length);
  fs.readSync(fd, buf, 0, magic.length, 0);
  fs.closeSync(fd);
  if (!magic.every((b, i) => buf[i] === b)) {
    fs.unlink(req.file.path, () => {});
    return res.status(400).json({ message: 'File content does not match its type' });
  }
  next();
}

module.exports = { upload, verifyMagicBytes, UPLOAD_DIR };
