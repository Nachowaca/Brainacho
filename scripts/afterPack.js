'use strict';

// Sin certificado de Apple, la app queda sin firma y macOS (sobre todo en Apple Silicon) dice "está dañada".
// Una firma ad-hoc ("-") alcanza para pruebas internas entre Macs.
const { execFileSync } = require('child_process');
const path = require('path');

exports.default = async function afterPack(context) {
  if (context.electronPlatformName !== 'darwin' || process.platform !== 'darwin') return;
  const app = path.join(context.appOutDir, `${context.packager.appInfo.productFilename}.app`);
  execFileSync('codesign', ['--force', '--deep', '--sign', '-', app], { stdio: 'inherit' });
};
