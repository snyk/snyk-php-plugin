import * as plugin from '../lib';

// Instructions:
// Run the following from this test folder:
//   node manual.js project_folder_path composer.lock
function main() {
  const targetPath = process.argv[2];
  const targetFile = process.argv[3];

  try {
    const result = plugin.inspect(targetPath, targetFile, {});
    // tslint:disable-next-line:no-console
    console.log(JSON.stringify(result, null, 2));
  } catch (error: any) {
    // tslint:disable-next-line:no-console
    console.log('Error:', error.stack);
  }
}

main();
