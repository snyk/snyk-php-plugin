var plugin = require('../lib');

// Instructions:
// Run the following from this test folder:
//   node manual.js project_folder_path composer.lock

function main() {
  var targetPath = process.argv[2];
  var targetFile = process.argv[3];
  plugin.inspect(targetPath, targetFile)
    .then(function (result) {
      console.log(JSON.stringify(result, null, 2));
    }).catch(function (error) {
      console.log('Error:', error.stack);
    });
};

main();
