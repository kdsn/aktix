const routes = {
  '':     () => import('./views/Dashboard/index.js').then(m => m.render()),
  'signals': () => import('./views/Signals/List.js').then(m => m.render()),
  'signals/:id': (params) => import('./views/Signals/Detail.js').then(m => m.render(params)),
  'orders': () => import('./views/Orders/index.js').then(m => m.render()),
  'portfolio': () => import('./views/Portfolio/index.js').then(m => m.render()),
  'settings': () => import('./views/Settings/index.js').then(m => m.render()),
  'auth/signin': () => import('./views/Auth/SignIn.js').then(m => m.render()),
  'auth/register': () => import('./views/Auth/Register.js').then(m => m.render()),
};
export function initRouter() { /* hashchange + parse + match */ }
