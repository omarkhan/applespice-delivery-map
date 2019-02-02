// Client ID and API key from the Developer Console
const CLIENT_ID = '430686616954-m7b49rs165ifs8u7eqocf1u7q0okcogf.apps.googleusercontent.com';
const API_KEY = 'AIzaSyAuSzd8mYYeR7K-rLQfHRht5bNTvt8Gy58';

// Array of API discovery doc URLs for APIs used by the quickstart
const DISCOVERY_DOCS = ['https://sheets.googleapis.com/$discovery/rest?version=v4'];

// Authorization scopes required by the API; multiple scopes can be
// included, separated by spaces.
const SCOPES = 'https://www.googleapis.com/auth/spreadsheets.readonly';

// Initialize the map here
const CHICAGO = { lat: 41.88, lng: -87.66 };

const MAIN_ROWS = [4, 7, 10, 13, 16, 19, 22, 25, 28, 31, 34, 37, 40, 43, 46, 49, 52, 55, 58, 61, 64, 67, 70, 73, 76, 79, 82, 85, 88, 91, 94, 97, 100];
const SECONDARY_ROWS = [104, 107, 110, 113];
const SPREADSHEET_ROUTES = [
  { colIndex: 0, col: 'A', rows: MAIN_ROWS, color: 'blue' },
  { colIndex: 2, col: 'C', rows: MAIN_ROWS, color: 'red' },
  { colIndex: 4, col: 'E', rows: MAIN_ROWS, color: 'green' },
  { colIndex: 7, col: 'H', rows: MAIN_ROWS, color: 'yellow' },
  { colIndex: 9, col: 'J', rows: MAIN_ROWS, color: 'purple' },
  { colIndex: 11, col: 'L', rows: MAIN_ROWS, color: 'aqua' },
  { colIndex: 0, col: 'A', rows: SECONDARY_ROWS, color: 'brown' },
  { colIndex: 2, col: 'C', rows: SECONDARY_ROWS, color: 'pink' },
  { colIndex: 4, col: 'E', rows: SECONDARY_ROWS, color: 'black' },
  { colIndex: 7, col: 'H', rows: SECONDARY_ROWS, color: 'magenta' },
  { colIndex: 9, col: 'J', rows: SECONDARY_ROWS, color: 'cyan' },
  { colIndex: 11, col: 'L', rows: SECONDARY_ROWS, color: 'lime' }
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
    center: CHICAGO,
    zoom: 13
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
  const columns = SPREADSHEET_ROUTES.map(route => route.col).sort();
  const range = `${columns[0]}:${columns[columns.length - 1]}`;
  gapi.client.sheets.spreadsheets.values.get({
    spreadsheetId,
    range
  }).then(response => {
    const { result } = response;
    if (result.values && result.values.length > 0) {
      const newRoutes = SPREADSHEET_ROUTES.map(route => {
        const rows = route.rows.map(index => result.values[index]).filter(Boolean);
        return rows
          .map(row => row[route.colIndex])
          .filter(Boolean)
          .map(address => /chicago/i.test(address) ? address : `${address} Chicago`)
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
