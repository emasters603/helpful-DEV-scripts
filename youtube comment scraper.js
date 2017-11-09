const fetchCommentPage = require('youtube-comment-api')
const fs = require('fs')
const clear = require('clear')

const csvOut = './data/comments.csv'
const tokenOut = './data/tokens.txt'


// target youtube video id for the video we want to pull comments from
const videoId = '08wQGEngPFE'

// tags to look for in comment text
const tags = []

/*
* Writes a comment and it's subseqeunt replies to formatted csv
*/
const writeData = (comment, tags, depth) => {
  // escape the commas by enclosing field in quotes
  const row = {
    depth: depth == 0 ? 'root' : `${'reply to'.repeat(depth-1)}reply`,
    tags: `\"${tags.join(', ')}\"`,
    author: `\"${comment.author}\"`,
    comment: `\"${comment.text.replace(/\n/, ' ')}\"`,
    likes: comment.likes.toString(),
  }
  const vals = Object.keys(row).map(key => row[key])
  fs.appendFileSync(csvOut, vals.join(', ') + '\n')
  if (comment.hasReplies) {
    // recursively write all of the replies to the csv file
    comment.replies.forEach(reply => {
      writeData(reply, [], depth + 1)
    })
  }
}


// counter to keep track of how many pages we need to parse through
let count = 0
 
/*
* Recursively grabs all the comment data from the youtube video hosted at 
* youtube.com/watch?v=${videoId}
*/
const getData = token => {
  clear()
  console.log(`Processing page ${count}...\n`)

  fetchCommentPage(videoId, token)
  .then(commentPage => {
    // write the token to outfile
    fs.appendFile(tokenOut, commentPage.nextPageToken + '\n', err => {
      if (err) {
        console.log(err)
        process.exit()
      }
    }) 

    commentPage.comments.forEach(comment => {
      if (comment.text) {
        const commentTags = tags.filter(tag => comment.text.includes(tag))
        if (commentTags.length > 0) 
          writeData(comment, commentTags, 0)
      }
    })

    if (!commentPage.nextPageToken) {
      console.log('\n...Finished Fetching Data!')
      process.exit()
    }
    else {
      count++
      // keep recursing on the next page of tokens
      getData(commentPage.nextPageToken)
    }
  })
}   

/*
* Writes headers to csvfile and calls getData
*/
const main = () => {
  const headers = 'Depth, Tags, Author, Comment, Likes\n'
  fs.writeFile(csvOut, headers, err => {
    if (err) {
      console.log(err)
      process.exit()
    }
    getData()
  })
}

// call main
main()