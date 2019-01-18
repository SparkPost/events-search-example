'use strict';

const request = require('request-promise');
const hostname = 'https://api.sparkpost.com';
const today = '2019-01-07T23:59';
const yesterday = '2019-01-06T00:00';
const firstPage = `${hostname}/api/v1/events/message?events=click&recipient_domains=gmail.com&cursor=initial&from=${yesterday}&to=${today}&timezone=UTC&per_page=100`;
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

let seenEvents = 0;

/**
 *  Toy recursive function that will page through all of the clicks
 *  originating from recipients that contain `gmail.com` in their email addresses
 *  from your SparkPost account in the last 24 hours (UTC) using
 *  the new Events API.
 *
 *  The five second delay in between API calls is so we are less likely
 *  to encounter any HTTP 429's (Rate Limiting), but if we do
 *  encounter any (or 5xx errors), we will retry automatically.
 *
 *  @param {string} url - Fully formed URL (including hostname) for calling the Events API
 *                        
 *  @returns {Promise} - Promise object for requesting the next page of results
 */
const retrieveEventsData = (url) => {
  const options = {
    json: true,
    headers: {
      'Authorization': process.env.SPARKPOST_API_KEY,
    },
    url
  };

  return request.get(options)
    .then((res) => {
      const nextPage = res.links.next;
      seenEvents += res.results.length

      console.log(`Retrieved ${seenEvents}/${res.total_count} results...`);

      if (nextPage) {
        console.log('Still more results, retrieving next page...');
        return wait(5000).then(() => retrieveEventsData(`${hostname}${nextPage}`));
      } else {
        console.log('End of results, exiting.');
      }
    })
    .catch((err) => {
      // Gracefully handle a rate limited request or unexpected error (retry)
      if (err.statusCode === 429 || err.statusCode >= 500) {
        console.log('429 or 5xx Request failure, retrying same request');
        return wait(10000).then(() => retrieveEventsData(`${url}`));
      }

      // We encountered something unexpected, so no more retries :(
      console.log('Unexpected error retrieving results, exiting.');
      console.log(err.message);
      console.log(`Last requested page was ${url}`);
    });
};

// Kick off the request for the first page!
retrieveEventsData(firstPage);
