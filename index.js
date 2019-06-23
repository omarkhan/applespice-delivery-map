// Client ID and API key from the Developer Console
const CLIENT_ID = '430686616954-m7b49rs165ifs8u7eqocf1u7q0okcogf.apps.googleusercontent.com';
const API_KEY = 'AIzaSyAuSzd8mYYeR7K-rLQfHRht5bNTvt8Gy58';

// Array of API discovery doc URLs for APIs used by the quickstart
const DISCOVERY_DOCS = ['https://sheets.googleapis.com/$discovery/rest?version=v4'];

// Authorization scopes required by the API; multiple scopes can be
// included, separated by spaces.
const SCOPES = 'https://www.googleapis.com/auth/spreadsheets.readonly';

// Initialize the map here
const START = { lat: 39.83, lng: -98.58 };

// Spreadsheet layout
const FIRST_ROW = 3;
const ROW_INTERVAL = 3;
const COLUMN_RANGE = 'A:Y';
const SPREADSHEET_ROUTES = [
  { column: 0, color: 'blue' },
  { column: 4, color: 'red' },
  { column: 8, color: 'green' },
  { column: 13, color: 'yellow' },
  { column: 17, color: 'purple' },
  { column: 21, color: 'aqua' }
];
const routes = SPREADSHEET_ROUTES.map(route => []);

// Controls
const authorizeButton = document.getElementById('authorize_button');
const loadButton = document.getElementById('load_button');
const signoutButton = document.getElementById('signout_button');
const originInput = document.getElementById('origin');
const spreadsheetIdInput = document.getElementById('spreadsheet_id');

let directionsRenderers, directionsService, map, origin, spreadsheetId;

// Initialize with values from localStorage
origin = localStorage.getItem('origin');
spreadsheetId = localStorage.getItem('spreadsheet_id');
originInput.value = origin || '';
spreadsheetIdInput.value = spreadsheetId || '';

// Refresh routes every minute
setInterval(mapRoutes, 60000);

// eslint-ignore-next-line no-unused-vars
function initMap() {
  directionsService = new google.maps.DirectionsService();
  map = new google.maps.Map(document.getElementById('map'), {
    center: START,
    zoom: 4
  });
  directionsRenderers = SPREADSHEET_ROUTES.map(route => new google.maps.DirectionsRenderer({
    polylineOptions: {
      strokeColor: route.color,
      strokeOpacity: 0.5
    }
  }));
}

// eslint-ignore-next-line no-unused-vars
function displayDirections(directionsRenderer, route) {
  if (route.length === 0) {
    directionsRenderer.setMap(null);
    return;
  }

  const points = [...route];
  const destination = points.pop();
  const waypoints = points.map(location => ({ location }));
  const request = {
    origin,
    waypoints,
    destination,
    travelMode: 'DRIVING'
  };
  directionsService.route(request, (result, status) => {
    if (status === 'OK') {
      directionsRenderer.setMap(map);
      directionsRenderer.setDirections(result);
    }
  });
}

function handleClientLoad() {
  gapi.load('client:auth2', initClient);
}

function initClient() {
  gapi.client.init({
    apiKey: API_KEY,
    clientId: CLIENT_ID,
    discoveryDocs: DISCOVERY_DOCS,
    scope: SCOPES
  }).then(function () {
    // Listen for sign-in state changes.
    gapi.auth2.getAuthInstance().isSignedIn.listen(updateSigninStatus);

    // Handle the initial sign-in state.
    updateSigninStatus(gapi.auth2.getAuthInstance().isSignedIn.get());
    authorizeButton.onclick = handleAuthClick;
    signoutButton.onclick = handleSignoutClick;

    // Hook up load button click handler
    loadButton.onclick = handleLoadClick;
  });
}

function updateSigninStatus(isSignedIn) {
  if (isSignedIn) {
    authorizeButton.style.display = 'none';
    loadButton.style.display = 'block';
    originInput.style.display = 'block';
    signoutButton.style.display = 'block';
    spreadsheetIdInput.style.display = 'block';
  } else {
    authorizeButton.style.display = 'block';
    loadButton.style.display = 'none';
    originInput.style.display = 'none';
    signoutButton.style.display = 'none';
    spreadsheetIdInput.style.display = 'none';
  }
}

function handleLoadClick() {
  origin = originInput.value.trim();
  spreadsheetId = spreadsheetIdInput.value.trim();
  localStorage.setItem('origin', origin);
  localStorage.setItem('spreadsheet_id', spreadsheetId);
  mapRoutes();
}

function handleAuthClick() {
  gapi.auth2.getAuthInstance().signIn();
}

function handleSignoutClick() {
  gapi.auth2.getAuthInstance().signOut();
}

function mapRoutes() {
  if (!origin || !spreadsheetId) return;
  gapi.client.sheets.spreadsheets.values.get({
    spreadsheetId,
    range: COLUMN_RANGE
  }).then(response => {
    const { result } = response;
    if (result.values && result.values.length > 0) {
      const newRoutes = SPREADSHEET_ROUTES.map(route => {
        const addresses = [];
        for (let i = FIRST_ROW; i < result.values.length; i += ROW_INTERVAL) {
          const row = result.values[i];
          const address = row[route.column];
          if (!address) continue;
          addresses.push(/chicago/i.test(address) ? address : `${address} Chicago`);
          const returnToStore = result.values[i - 1][route.column + 3] // return to store checkbox
          if (returnToStore === 'TRUE') addresses.push(origin);
        }
        return addresses;
      });
      newRoutes.forEach((route, index) => {
        if (!arrayEqual(route, routes[index])) {
          routes[index] = route;
          displayDirections(directionsRenderers[index], route);
        }
      })
    } else {
      console.log('No data found.');
    }
  }, response => {
    console.error('Error: ' + response.result.error.message);
  });
}

function arrayEqual(a, b) {
  return a.length === b.length && a.every((value, index) => b[index] === value)
}
