import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const imagePath = path.join(__dirname, 'public', 'gbti-logo.png');
const tsxPath = path.join(__dirname, 'src', 'components', 'configurator', 'steps', 'StepLeadCapture.tsx');

const base64Image = fs.readFileSync(imagePath, { encoding: 'base64' });
const dataUri = `data:image/png;base64,${base64Image}`;

let tsxContent = fs.readFileSync(tsxPath, 'utf8');

// Replace the existing GBTI_LOGO_BASE64 declaration with the correct one
const regex = /const GBTI_LOGO_BASE64 = '[^']+';/g;
tsxContent = tsxContent.replace(regex, `const GBTI_LOGO_BASE64 = '${dataUri}';`);

fs.writeFileSync(tsxPath, tsxContent, 'utf8');
console.log('Successfully injected the true base64 logo into StepLeadCapture.tsx');
