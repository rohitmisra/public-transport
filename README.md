# Public Transport

A Node.js wrapper for fetching live departures of popular public transport providers/utilities across the world.

## Installation

`npm i public-transport`

## Usage

Require the public-transport module in your project
```
var timetable = require('public-transport');

var p = publictransport.departures(options);

p.then(function(value) {
    console.log("Closest Match: " + value.station.name);
    value.departures.prettyPrint();
});
```


## Documentation

### Transit providers supported:
- Germany (S-bahn, U-Bahn, ICE, IC, etc)
- India (Indian Railways)

### API
- For Germany

`var p = publictransport.departures({ type: 'dbahn', station: 'hausener weg', products: 'u' });`
- 'product' - product filter

- For India
`var p = publictransport.departures({ type: 'irctc', station: 'bhubaneswar'});`

departures method returns a Promise which returns a timetable object on completion.
prettyPrint() method in the timetable object display a formatted timetable.


## Contibution

Please raise issues for expected features or contribute by pull requests : )