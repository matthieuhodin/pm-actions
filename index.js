const github = require('@actions/github');
const core = require('@actions/core');

async function actualiserTotalMilestone(octokit,owner, repo, milestoneNumber){
   console.log(`actualiserTotalMilestone ${owner}-${repo}-${milestoneNumber}.`);
   
   
   var queryParams={
                       owner:owner,
                       repo: repo,
                       milestone: milestoneNumber//4812794//parseInt(milestoneId,10)
                     }
   
   console.log(JSON.stringify(queryParams));
   const issues = await octokit.issues.listForRepo(queryParams);
   console.log(JSON.stringify(issues.data));
}

async function actualiserTotalColonne(octokit, columnId){
   console.log('actualiserTotalColonne:'+columnId);
   var total=0;
   var cardStat=null;
   const resultCards = await octokit.projects.listCards({column_id: columnId });
  
   for(var iCard=0; iCard<  resultCards.data.length; iCard++){
      var card=resultCards.data[iCard];
      if( (card.content_url||'').indexOf('/issues/')>0){
         var segments= card.content_url.split('/');

         var owner = segments[segments.length-4];
         var repo=segments[segments.length-3];
         var issue_number = segments[segments.length-1];
         const detailIssue = await octokit.issues.get({
                                owner,
                                repo,
                                issue_number
                              });

         for(var iLabel =0 ; iLabel < detailIssue.data.labels.length; iLabel++){
            var label = detailIssue.data.labels[iLabel];

            if( label.name.indexOf('size:')==0){
               total+= parseFloat(label.name.replace('size:',''))
            }
         }
      }
      
      if( (card.note||'').indexOf('<!--STAT-->')==0){
         cardStat= resultCards.data[iCard];
      }
      
   }
   
   if (cardStat==null){
      const createCardResult= await octokit.projects.createCard({column_id: columnId , note:'<!--STAT-->'})
      cardStat= createCardResult.data;
   }
   
   const updateCard= await  octokit.projects.updateCard({card_id:cardStat.id, note:'<!--STAT-->Total : '+ total})
   
   console.log('Total :'+total);
    //     "content_url": "https://api.github.com/repos/matthieuhodin/pm-actions/issues/1"
   
}


async function run() {
    // This should be a token with access to your repository scoped in as a secret.
    // The YML workflow will need to set myToken with the GitHub Secret Token
    // myToken: ${{ secrets.GITHUB_TOKEN }}
    // https://help.github.com/en/articles/virtual-environments-for-github-actions#github_token-secret
    const myToken = core.getInput('myToken');
    const octokit = new github.GitHub(myToken);
   
   const actionType = core.getInput('action-type');
       
   console.log('actionType : '+actionType);
   
   if( actionType== 'project_card'){
      // Get the JSON webhook payload for the event that triggered the workflow
      //const payload = JSON.stringify(github.context.payload, undefined, 2)
      //console.log(`The event payload: ${payload}`);
      await actualiserTotalColonne(octokit, github.context.payload.project_card.column_id);
      if( github.context.payload.changes && github.context.payload.changes.column_id && github.context.payload.changes.column_id.from){
       await actualiserTotalColonne(octokit, github.context.payload.changes.column_id.from);
      }
   }
   
   if( actionType== 'milestone'){
    // const payload = JSON.stringify(github.context.payload, undefined, 4)
    //  console.log(`The event payload: ${payload}`);
      var milestoneNumber= github.context.payload.issue.milestone.number;
      var owner=   github.context.payload.repository.owner.login;
      var repo= github.context.payload.repository.name;
      await actualiserTotalMilestone(octokit,owner, repo, milestoneNumber);
   }
}

run();




