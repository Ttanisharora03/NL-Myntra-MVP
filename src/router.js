const routes = [];
let routeChangeCallback = null;

export function addRoute(pattern, handler) {
  // Convert /product/:id to regex
  const paramNames = [];
  const regexPath = pattern.replace(/:([^\/]+)/g, (_, key) => {
    paramNames.push(key);
    return '([^\/]+)';
  });
  routes.push({
    pattern,
    regex: new RegExp(`^${regexPath}$`),
    paramNames,
    handler
  });
}

export function navigateTo(path) {
  window.location.hash = path;
}

export function getCurrentPath() {
  return window.location.hash.slice(1) || '/';
}

export function onRouteChange(callback) {
  routeChangeCallback = callback;
}

function handleHashChange() {
  const path = getCurrentPath();
  let matchedRoute = null;
  let params = {};

  for (const route of routes) {
    const match = path.match(route.regex);
    if (match) {
      matchedRoute = route;
      route.paramNames.forEach((name, index) => {
        params[name] = match[index + 1];
      });
      break;
    }
  }

  if (matchedRoute && routeChangeCallback) {
    routeChangeCallback({
      path,
      params,
      handler: matchedRoute.handler
    });
  }
}

window.addEventListener('hashchange', handleHashChange);
// Export manual trigger for initial load
export function triggerRoute() {
  handleHashChange();
}
