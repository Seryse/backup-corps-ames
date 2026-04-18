import common from './common.json';
import auth from './auth.json';
import home from './home.json';
import admin from './admin.json';
import dashboard from './dashboard.json';
import shop from './shop.json';
import trainings from './trainings.json';
import session from './session.json';
import agenda from './agenda.json';
import messages from './messages.json';

const es = {
  ...common,
  ...auth,
  ...home,
  ...admin,
  ...dashboard,
  ...shop,
  ...trainings,
  ...session,
  ...agenda,
  ...messages,
};

export default es;