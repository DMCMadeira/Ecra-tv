/**
 * Proxy GA4 Realtime para o ecrã de sinalização.
 * Publicar como Web App (Deploy > New deployment > Web app)
 *   - Execute as: Me
 *   - Who has access: Anyone
 * O URL de deploy é o que vai no fetch() da página HTML.
 */

var PROPERTY_ID = '503983578'; // propriedade GA4 (Property ID, não Account ID)

// Cada relatório pede 1 dimensão + 1 métrica, tal como os cartões do GA4 Realtime overview.
var REPORTS = [
  { key: 'byPage',     dimension: 'unifiedScreenName', metric: 'screenPageViews' },
  { key: 'byDevice',   dimension: 'deviceCategory',    metric: 'activeUsers' },
  { key: 'byPlatform', dimension: 'platform',          metric: 'activeUsers' },
  { key: 'byCountry',  dimension: 'country',           metric: 'activeUsers' },
  { key: 'byCity',     dimension: 'city',              metric: 'activeUsers' },
  { key: 'byEvent',    dimension: 'eventName',         metric: 'eventCount' },
];

function runReport(dimension, metric) {
  var request = {
    metrics: [{ name: metric }],
    dimensions: [{ name: dimension }],
  };
  var response = AnalyticsData.Properties.runRealtimeReport(
    request,
    'properties/' + PROPERTY_ID
  );

  var rows = [];
  var total = 0;
  if (response.rows) {
    response.rows.forEach(function (row) {
      var label = row.dimensionValues[0].value;
      var value = parseInt(row.metricValues[0].value, 10);
      total += value;
      rows.push({ label: label, users: value });
    });
  }
  rows.sort(function (a, b) { return b.users - a.users; });
  return { total: total, rows: rows.slice(0, 8) };
}

// Utilizadores ativos por minuto, últimos 30 minutos (minutesAgo: '00'..'29').
function runTimeline() {
  var request = {
    metrics: [{ name: 'activeUsers' }],
    dimensions: [{ name: 'minutesAgo' }],
  };
  var response = AnalyticsData.Properties.runRealtimeReport(
    request,
    'properties/' + PROPERTY_ID
  );

  var byMinute = {};
  if (response.rows) {
    response.rows.forEach(function (row) {
      var minutesAgo = parseInt(row.dimensionValues[0].value, 10);
      var users = parseInt(row.metricValues[0].value, 10);
      byMinute[minutesAgo] = users;
    });
  }

  var timeline = [];
  for (var i = 29; i >= 0; i--) {
    timeline.push(byMinute[i] || 0);
  }
  return timeline; // timeline[0] = há 29 min, timeline[29] = agora
}

function doGet(e) {
  var output;
  try {
    var result = { updatedAt: new Date().toISOString() };

    REPORTS.forEach(function (r) {
      var report = runReport(r.dimension, r.metric);
      result[r.key] = report.rows;
    });

    result.activeUsers = runReport('unifiedScreenName', 'activeUsers').total;
    result.timeline = runTimeline();
    output = result;
  } catch (err) {
    output = { error: err.message };
  }

  return ContentService
    .createTextOutput(JSON.stringify(output))
    .setMimeType(ContentService.MimeType.JSON);
}
