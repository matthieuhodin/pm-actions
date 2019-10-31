const core = require('@actions/core');
const github = require('@actions/github');

function actualiserTotalColonne(columnId){
   const resultCards = await github.projects.listCards({column_id: columnId });
  
  console.log('resultCards :', resultCards);
  
}

try {
  // `who-to-greet` input defined in action metadata file
  const nameToGreet = core.getInput('who-to-greet');
  console.log(`Hello ${nameToGreet}!`);
  const time = (new Date()).toTimeString();
  core.setOutput("time", time);
  // Get the JSON webhook payload for the event that triggered the workflow
  const payload = JSON.stringify(github.context.payload, undefined, 2)
  console.log(`The event payload: ${payload}`);
  
  actualiserTotalColonne( github.context.payload.project_card.column_id);
  if( github.context.payload.changes && github.context.payload.changes.column_id && github.context.payload.changes.column_id.from){
    actualiserTotalColonne(github.context.payload.changes.column_id.from);
  }
  
} catch (error) {
  core.setFailed(error.message);
}
