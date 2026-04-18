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

const fr = {
  ...common,    // Contient: header, contact
  ...auth,      // Contient: auth
  ...home,      // Contient: landing, home, about_page, soins_page
  ...admin,     // Contient: admin, stats_page
  ...dashboard, // Contient: dashboard_page, account_page, bookings_page, grimoire_page
  ...shop,      // Contient: shop, checkout
  ...trainings, // Contient: trainings, training_page
  ...session,   // Contient: session
  ...agenda,    // Contient: agenda
  ...messages,  // Contient: messages
};

export default fr;