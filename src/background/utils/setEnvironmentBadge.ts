// Set environment badge based on branch

export const setEnvironmentBadge = () => {
  const deploymentEnv = process.env.DEPLOYMENT_ENV;

  if (deploymentEnv === 'production') {
    // No badge for production
    chrome.action.setBadgeText({ text: '' });
  } else if (deploymentEnv === 'staging') {
    chrome.action.setBadgeText({ text: 'stg' });
  } else if (deploymentEnv === 'development') {
    chrome.action.setBadgeText({ text: 'dev' });
  } else {
    chrome.action.setBadgeText({ text: 'lcl' });
  }
  chrome.action.setBadgeBackgroundColor({ color: '#121212' });
};
