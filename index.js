const core = require('@actions/core');
const github = require('@actions/github');

async function actualiserTotalColonne(octokit, columnId){
   
   console.log('actualiserTotalColonne:'+columnId);
   const resultCards = await octokit.projects.listCards({column_id: columnId });
  
   console.log('resultCards :');
   console.log(JSON.stringify(resultCards, undefined, 2));
  
}

try {
   
  const myToken = core.getInput('myToken');
  const octokit = new github.GitHub(myToken);

  // `who-to-greet` input defined in action metadata file
  const nameToGreet = core.getInput('who-to-greet');
  console.log(`Hello ${nameToGreet}!`);
  const time = (new Date()).toTimeString();
  core.setOutput("time", time);
  // Get the JSON webhook payload for the event that triggered the workflow
  //const payload = JSON.stringify(github.context.payload, undefined, 2)
  //console.log(`The event payload: ${payload}`);
  console.log('evenement recu');
  await actualiserTotalColonne(octokit, github.context.payload.project_card.column_id);
  if( github.context.payload.changes && github.context.payload.changes.column_id && github.context.payload.changes.column_id.from){
    await actualiserTotalColonne(octokit, github.context.payload.changes.column_id.from);
  }
  
} catch (error) {
  core.setFailed(error.message);
}
