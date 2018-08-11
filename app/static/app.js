$( document ).ready( () => {

  // AJAX function for sending address data, after validation, to the queryZillow endpoint
  $('.submitBtn').click( () => {
    $('.main').css('width', '78%');
      onNewSearch();
      $('.slides-link').fadeOut();
      $('.preselection').fadeOut();
      var street = $('.streetInput').val().replace(/,/g, ' ').split(' ').join('+').toLowerCase();
      var city = $('.cityInput').val() + '%2C+';
      var state = $('.stateInput').val();
      street = $.trim(street);
      city = $.trim(city);
      state = $.trim(state);
      state = checkStateInput(state);
      var getAddress = {'street': street, 'city': city, 'state': state};
       $.ajax({
         type: 'POST',
         url: '/queryZillow',
         dataType: 'json',
         contentType: 'application/json; charset=utf-8',
         data: JSON.stringify(getAddress),
         success: (res) => {
           res.result = JSON.parse(res.result);
           buildImageUrls(res.dataList.res);
           buildHomeInfo(res);
           initMap(res.dataList.res);
         },
         error: (err) => {
           $('.no-results-error').fadeIn();
           setTimeout( () => {
             $('.no-results-error').fadeOut();
           }, 3000);
           console.log(err);
         }
      });
  });

});

var checkStateInput = (state) => {

  var states = {
    'Alabama': 'AL',
    'Alaska': 'AK',
    'American Samoa': 'AS',
    'Arizona': 'AZ',
    'Arkansas': 'AR',
    'California': 'CA',
    'Colorado': 'CO',
    'Connecticut': 'CT',
    'Delaware': 'DE',
    'District Of Columbia': 'DC',
    'Federated States Of Micronesia': 'FM',
    'Florida': 'FL',
    'Georgia': 'GA',
    'Guam': 'GU',
    'Hawaii': 'HI',
    'Idaho': 'ID',
    'Illinois': 'IL',
    'Indiana': 'IN',
    'Iowa': 'IA',
    'Kansas': 'KS',
    'Kentucky': 'KY',
    'Louisiana': 'LA',
    'Maine': 'ME',
    'Marshall Islands': 'MH',
    'Maryland': 'MD',
    'Massachusetts': 'MA',
    'Michigan': 'MI',
    'Minnesota': 'MN',
    'Mississippi': 'MS',
    'Missouri': 'MO',
    'Montana': 'MT',
    'Nebraska': 'NE',
    'Nevada': 'NV',
    'New Hampshire': 'NH',
    'New Jersey': 'NJ',
    'New Mexico': 'NM',
    'New York': 'NY',
    'North Carolina': 'NC',
    'North Dakota': 'ND',
    'Northern Mariana Islands': 'MP',
    'Ohio': 'OH',
    'Oklahoma': 'OK',
    'Oregon': 'OR',
    'Palau': 'PW',
    'Pennsylvania': 'PA',
    'Puerto Rico': 'PR',
    'Rhode Island': 'RI',
    'South Carolina': 'SC',
    'South Dakota': 'SD',
    'Tennessee': 'TN',
    'Texas': 'TX',
    'Utah': 'UT',
    'Vermont': 'VT',
    'Virgin Islands': 'VI',
    'Virginia': 'VA',
    'Washington': 'WA',
    'West Virginia': 'WV',
    'Wisconsin': 'WI',
    'Wyoming': 'WY'};

  if(state.length > 2) {
    if(state.split(' ').length >= 2) {
      var splitState = state.split(' ');
      var resultState = '';
      splitState.forEach( (word, index) => {
        var firstLetter = word[0].toUpperCase();
        var subLetters = word.slice(1).toLowerCase();
        resultState += index === splitState.length-1 ? firstLetter + subLetters : firstLetter + subLetters + " ";
      });
      return states[resultState];
    }
    var firstLetter = state[0].toUpperCase();
    var subLetters = state.slice(1).toLowerCase();
    state = firstLetter + subLetters;
    return states[state];
  } else {
    return state.toUpperCase();
  }
}

// clears search state when new search is initiated
var onNewSearch = () => {
  $('.thumbnail-search-homes').empty();
  $('.main-searched-home').empty();
  $('.map').empty();
};

// creates new google maps instance when API returns location of primary and comparable home data
var initMap = (res) => {
  var map = new GMaps({
    div: '.map',
    lat: res[0].address.latitude,
    lng: res[0].address.longitude,
    zoom: 12
  });
  res.forEach( (pos, index) => {
    if(index === 0) {
      map.addMarker({
        lat: pos.address.latitude,
        lng: pos.address.longitude,
        icon: 'http://maps.google.com/mapfiles/ms/icons/green-dot.png'
      });
    } else {
      map.addMarker({
        lat: pos.address.latitude,
        lng: pos.address.longitude,
        mouseover: (e) => {
          mouseOverMarker(index);
        },
        mouseout: (e) => {
          mouseOutMarker(index);
        }
      });
    }
  });
}

/***********************************
  Map Marker mouseover functions
***********************************/

var mouseOverMarker = (index) => {
  $('#thumbnail-' + index).addClass('thumbnail-mouseover');
};

var mouseOutMarker = (index) => {
  $('#thumbnail-' + index).removeClass('thumbnail-mouseover');
}

/*********************************
*********************************/

// buildHomeInfo adds elements with meta data about home and Utility cost prices
var buildHomeInfo = (res) => {
  var results = res.result[0];
  var metaData = res.dataList;
  var main_section = $('.main-searched-home');
  results.forEach( (result, index) => {
    var sqft = parseInt(metaData.res[index].finishedSqFt);
    var address = metaData.res[index].address;
    if(index === 0) {
      var estimate = '<div class="main-text col-lg-6 col-md-6 col-sm-12 col-xs-12"><div class="main-estimate">$' + Math.round(result/12) + ' / mo</div><div class="main-sqft-estimate">$' + Math.ceil((result/sqft) * 100) / 100 + ' / sqft</div><div class="main-address"><div class="address-street">' + address.street + ',\n' + '</div><div class="address-city">' + address.city + ',\n' + '</div><div class="address-state">' + address.state
      + '</div></div></div>';
      main_section.prepend(estimate);
    } else {
      var estimate = '<div class="thumbnail-estimate">$' + Math.round(result/12) + ' / mo</div><div class="thumbnail-sqft-estimate">$' + Math.ceil((result/sqft) * 100) / 100 + ' / sqft</div>'
      $('#thumbnail-text-' + index).append(estimate);
    }
  });
};

// buildImageUrls collects addresses from all returned homes and creates URL for GET request to google streetviews
var buildImageUrls = (res) => {
  res.forEach( (home, index) => {
    var street = home.address.street.split(' ').join('+');
    var city = home.address.city.split(' ').join('+');
    var state = home.address.state;
    var imageUrl;
    var thumbnail_section = $('.thumbnail-search-homes');
    if(index === 0) {
      var image = 'https://maps.googleapis.com/maps/api/streetview?size=640x400&location=' + street + '&citystatezip=' + city + '%2C+' + state + '&key=AIzaSyDpJs9djR5SYTF-27J087X4qpSXZDuNOpk';
      imageUrl = '<img class="main-image col-lg-6 col-md-6 col-sm-12 col-xs-12" src=' + image + '>';
      $('.main-searched-home').append(imageUrl);
    } else {
      var image = 'https://maps.googleapis.com/maps/api/streetview?size=640x400&location=' + street + '&citystatezip=' + city + '%2C+' + state + '&key=AIzaSyDpJs9djR5SYTF-27J087X4qpSXZDuNOpk';
      imageUrl = '<div id=thumbnail-' + index + ' class="thumbnail col-md-12"><img class="thumbnail-image" src=' + image + '><div id=thumbnail-text-' + index + ' class="image-text"></div></div>'
      thumbnail_section.append(imageUrl);
    }
    if(index === res.length-1) {
      $('.thumbnail-search-homes').fadeIn();
    }
  });
};
