// src/gas/fb_handler.gs

/**
 * Posts a photo with caption to Facebook Page.
 */
function postToFacebook(caption, imageUrl) {
  const url = `https://graph.facebook.com/v19.0/${CONFIG.FB_PAGE_ID}/photos`;
  
  const payload = {
    url: imageUrl,
    caption: caption,
    access_token: CONFIG.FB_PAGE_ACCESS_TOKEN
  };

  const options = {
    method: "post",
    payload: payload
  };

  try {
    const response = UrlFetchApp.fetch(url, options);
    const result = JSON.parse(response.getContentText());
    return result.id;
  } catch (e) {
    Logger.log("Error posting to Facebook: " + e.message);
    return null;
  }
}
