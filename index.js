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

const COLUMNS = [
  { index: 0, key: 'A', color: 'blue' },
  { index: 2, key: 'C', color: 'red' },
  { index: 4, key: 'E', color: 'green' },
  { index: 7, key: 'H', color: 'yellow' },
  { index: 9, key: 'J', color: 'purple' }
];
const ROWS = [4, 7, 10, 13, 16, 19, 22, 25];

// Controls
const authorizeButton = document.getElementById('authorize_button');
const loadButton = document.getElementById('load_button');
const signoutButton = document.getElementById('signout_button');
const spreadsheetIdInput = document.getElementById('spreadsheet_id');

let directionsRenderers, directionsService, map, spreadsheetId;

// Refresh routes every minute
setInterval(mapRoutes, 60000);

// eslint-ignore-next-line no-unused-vars
function initMap() {
  directionsService = new google.maps.DirectionsService();
  map = new google.maps.Map(document.getElementById('map'), {
    center: CHICAGO,
    zoom: 13
  });
  directionsRenderers = COLUMNS.map(column => new google.maps.DirectionsRenderer({
    map,
    polylineOptions: {
      strokeColor: column.color,
      strokeOpacity: 0.5
    }
  }));
}

// eslint-ignore-next-line no-unused-vars
function displayDirections(directionsRenderer, origin, ...route) {
  const points = [...route];
  const destination = points.pop();
  const waypoints = points.map(location => {
    return { location }
  });
  const request = {
    origin,
    waypoints,
    destination,
    travelMode: 'DRIVING'
  };
  directionsService.route(request, (result, status) => {
    if (status === 'OK') {
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
    signoutButton.style.display = 'block';
    spreadsheetIdInput.style.display = 'block';
  } else {
    authorizeButton.style.display = 'block';
    loadButton.style.display = 'none';
    signoutButton.style.display = 'none';
    spreadsheetIdInput.style.display = 'none';
  }
}

function handleLoadClick() {
  spreadsheetId = spreadsheetIdInput.value.trim();
  mapRoutes();
}

function handleAuthClick() {
  gapi.auth2.getAuthInstance().signIn();
}

function handleSignoutClick() {
  gapi.auth2.getAuthInstance().signOut();
}

function mapRoutes() {
  if (!spreadsheetId) return;
  const range = `${COLUMNS[0].key}:${COLUMNS[COLUMNS.length - 1].key}`;
  gapi.client.sheets.spreadsheets.values.get({
    spreadsheetId,
    range
  }).then(function(response) {
    const { result } = response;
    if (result.values && result.values.length > 0) {
      const rows = ROWS.map(index => result.values[index]).filter(Boolean);
      COLUMNS.forEach((column, index) => {
        const route = rows
          .map(row => row[column.index])
          .filter(Boolean)
          .map(address => /chicago/i.test(address) ? address : `${address} Chicago`);
        displayDirections(directionsRenderers[index], ...route);
      })
    } else {
      console.log('No data found.');
    }
  }, function(response) {
    console.error('Error: ' + response.result.error.message);
  });
}
