const github = require('@actions/github');
const core = require('@actions/core');


async function actualiserTotalColonne(octokit, columnId){
   console.log('actualiserTotalColonne:'+columnId);
   const resultCards = await octokit.projects.listCards({column_id: columnId });
  
   console.log('resultCards :');
   console.log(JSON.stringify(resultCards, undefined, 2));  
}


async function run() {
    // This should be a token with access to your repository scoped in as a secret.
    // The YML workflow will need to set myToken with the GitHub Secret Token
    // myToken: ${{ secrets.GITHUB_TOKEN }}
    // https://help.github.com/en/articles/virtual-environments-for-github-actions#github_token-secret
    const myToken = core.getInput('myToken');

    const octokit = new github.GitHub(myToken);

    const { data: pullRequest } = await octokit.pulls.get({
        owner: 'octokit',
        repo: 'rest.js',
        pull_number: 123,
        mediaType: {
          format: 'diff'
        }
    });

    console.log(pullRequest);
   
   // Get the JSON webhook payload for the event that triggered the workflow
   //const payload = JSON.stringify(github.context.payload, undefined, 2)
   //console.log(`The event payload: ${payload}`);
   actualiserTotalColonne(octokit, github.context.payload.project_card.column_id);
   if( github.context.payload.changes && github.context.payload.changes.column_id && github.context.payload.changes.column_id.from){
    actualiserTotalColonne(octokit, github.context.payload.changes.column_id.from);
   }
   
}

run();




