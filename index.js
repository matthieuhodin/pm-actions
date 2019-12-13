const github = require('@actions/github');
const core = require('@actions/core');

async function transfereIssuesSurProchainMilestone(octokit,owner, repo, milestoneNumber){
  

   var nextMilestone= await octokit.issues.listMilestonesForRepo({owner:owner, repo:repo, state :'open', sort:'due_on', direction:'asc', per_page:1  });
  
  console.log('nextMilestone');
  console.log(JSON.stringify(nextMilestone,' ', 4));
  
   if( nextMilestone!= null && nextMilestone.data!= null){
       var queryParams={
                        owner:owner,
                        repo: repo,
                        milestone: milestoneNumber,
                        state:'open',
                        per_page:100
                     };
   

      const issues = await octokit.issues.listForRepo(queryParams);
      
     
      console.log(JSON.stringify(issues.data));
      
      for(var i=0; i< issues.data.length; i++){
         await octokit.issues.update({
                          owner:owner,
                          repo:repo,
                          issue_number:issues.data[i].issue_number,
                           milestone:nextMilestone.data.number
                        })
      }
      
   }
   
}

async function actualiserTotalMilestone(octokit,owner, repo, milestoneNumber){
   console.log(`actualiserTotalMilestone ${owner}-${repo}-${milestoneNumber}.`);
   
   
   var queryParams={
                       owner:owner,
                       repo: repo,
                       milestone: milestoneNumber//4812794//parseInt(milestoneId,10)
                     }
   

   const issues = await octokit.issues.listForRepo(queryParams);
   //console.log(JSON.stringify(issues.data));
   
   var total=0;
   var totalHt={};
   for(var i=0; i< issues.data.length;i++){
      var sizeOfIssue=getSizeOfIssue(issues.data[i]);
      total+=sizeOfIssue;
      
      totalHt[issues.data[i].state]=(totalHt[issues.data[i].state]||0)+sizeOfIssue;
   }
   
   console.log(total);
   console.log(totalHt);
   
   var updateMilestoneResult= await octokit.issues.updateMilestone({
                                owner: owner,
                                repo:repo,
                                milestone_number:milestoneNumber,
                                description: 'Total '+ total + ' / ' + Object.keys(totalHt).reduce((c,i)=>{c+=' '+i+'='+totalHt[i]; return c;},'')
                              })
   
}

function getSizeOfIssue(issue){
   var total=0;
   
   for(var iLabel =0 ; iLabel <issue.labels.length; iLabel++){
      var label =issue.labels[iLabel];

      if( label.name.indexOf('size:')==0){
         total+= parseFloat(label.name.replace('size:',''))
      }
   }
   return total;
}

async function actualiserStatsProjet(octokit, projectId){
   var resultCols= await octokit.projects.listColumns({
                    project_id:  projectId
                  });
   
   var stats={};
   for(var i=0; i< resultCols.data.length; i++){
      var totalColonne = await actualiserTotalColonne(octokit, resultCols.data[i].id);
      stats[resultCols.data[i].name]=totalColonne;
   }
   
   console.log('stats');
   console.log(stats);
   
   var max=0;
   for(var p in stats){
      if( stats[p]>max){
         max=stats[p]
      }
   }
   
   var projectResult= await octokit.projects.get({project_id:projectId})
   
   await octokit.projects.update({project_id: projectId, body:'```'+JSON.stringify(stats, null, 2)+'```'})
   
   
}

async function getColumnInfo(octokit, columnId){
   const resultColumn = await octokit.projects.getColumn({column_id: columnId})
   
   return resultColumn.data
  
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

         total+= getSizeOfIssue(detailIssue.data);
         
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
   
   return total;
   
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
   
   if( actionType === 'next-milestone'){
     
         var milestoneNumber= github.context.payload.milestone.number;
         var owner=   github.context.payload.repository.owner.login;
         var repo= github.context.payload.repository.name;
         await transfereIssuesSurProchainMilestone(octokit,owner, repo, milestoneNumber);
   }
   
   if( actionType== 'project_card'){
      // Get the JSON webhook payload for the event that triggered the workflow
      //const payload = JSON.stringify(github.context.payload, undefined, 2)
      //console.log(`The event payload: ${payload}`);
      await actualiserTotalColonne(octokit, github.context.payload.project_card.column_id);
      if( github.context.payload.changes && github.context.payload.changes.column_id && github.context.payload.changes.column_id.from){
       await actualiserTotalColonne(octokit, github.context.payload.changes.column_id.from);
      }
   }
   
   if( actionType== 'project'){
      // Get the JSON webhook payload for the event that triggered the workflow
      const payload = JSON.stringify(github.context.payload, undefined, 2)
      console.log(`The event payload: ${payload}`);
      var column = await getColumnInfo(octokit, github.context.payload.project_card.column_id);
      
      console.log( 'project column');
      console.log(JSON.stringify(column));
      
      var temp=column.project_url.split('/')
      await actualiserStatsProjet(octokit, temp[temp.length-1]);
      
      //await actualiserTotalColonne(octokit, github.context.payload.project_card.column_id);
      //if( github.context.payload.changes && github.context.payload.changes.column_id && github.context.payload.changes.column_id.from){
      // await actualiserTotalColonne(octokit, github.context.payload.changes.column_id.from);
      //}
   }
   
   if( actionType== 'milestone'){
      
      if (github.context.payload.issue.milestone!= null){
         var milestoneNumber= github.context.payload.issue.milestone.number;
         var owner=   github.context.payload.repository.owner.login;
         var repo= github.context.payload.repository.name;
         await actualiserTotalMilestone(octokit,owner, repo, milestoneNumber);
      }else{
         const payload = JSON.stringify(github.context.payload, undefined, 4)
         console.log(`The event payload: ${payload}`);
      
      }
   }
}

run();




