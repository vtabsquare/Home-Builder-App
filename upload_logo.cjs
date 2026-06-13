const fs = require('fs');
const path = require('path');
const https = require('https');

const imagePath = path.join(__dirname, 'public', 'gbti-logo.png');

if (!fs.existsSync(imagePath)) {
  console.error("File not found");
  process.exit(1);
}

const FormData = require('form-data');
const form = new FormData();
form.append('reqtype', 'fileupload');
form.append('fileToUpload', fs.createReadStream(imagePath));

const req = https.request('https://catbox.moe/user/api.php', {
  method: 'POST',
  headers: form.getHeaders(),
}, (res) => {
  let body = '';
  res.on('data', chunk => body += chunk);
  res.on('end', () => {
    console.log("Uploaded URL:", body);
  });
});

req.on('error', (e) => {
  console.error(e);
});

form.pipe(req);
