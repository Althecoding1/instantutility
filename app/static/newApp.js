var appState = {
  onHome: true,
  onSuccess: false,
  mainImages: [],
  thumbnailImages: [],
  markers: {}
};


$( document ).ready( () => {


  $('#landing-address').focus();

  $("#address").geocomplete({
    map: '.map'
  });
  $('#landing-address').geocomplete({
    map: '.map'
  });

  // AJAX function for sending address data, after validation, to the queryZillow endpoint
  $('.submitBtn').click( () => {
      onNewSearch();
      var address;
      if(appState.onHome) {
        address = $('#landing-address').trigger("geocode")[0].value.split(',');
        appState.onHome = false;
      } else {
        address = $('#address').trigger("geocode")[0].value.split(',');
      }
      var street = address[0].split(' ').join('+').toLowerCase();
      var city = address[1].split(' ').join('+') + '%2C+';
      var state = address[2][1] + address[2][2];
      street = $.trim(street);
      city = $.trim(city);
      state = $.trim(state);
      state = checkStateInput(state);
      var d1 = $.Deferred(), d2 = $.Deferred();
      $('.landing-search-row').fadeOut();
      var getAddress = {'street': street, 'city': city, 'state': state};
       $.ajax({
         type: 'POST',
         url: '/queryZillow',
         dataType: 'json',
         contentType: 'application/json; charset=utf-8',
         data: JSON.stringify(getAddress),
         success: (res) => {
           $('.loading-homes').fadeOut();
           appState.onSuccess = true;
           $('.search-row').fadeIn();
           $('#address').focus();
           res.result = JSON.parse(res.result);
           buildImageUrls(res);
         },
         error: (err) => {
           if(appState.onSuccess) {
             $('.no-results-error').fadeIn();
           } else {
             appState.onHome = true;
             $('.no-results-error').fadeIn();
             $('.landing-search-row').fadeIn();
           }
           setTimeout( () => {
             $('.no-results-error').fadeOut();
           }, 3000);
           console.log(err);
         }
      });
  });

  var buildHomeInfo = (res, index, type) => {
    var results = res.result[0];
    var result = results[index];
    var metaData = res.dataList;
    var main_section = $('.main-search-homeImage');
    var sqft = parseInt(metaData.res[index].finishedSqFt);
    var address = metaData.res[index].address;

    var mainEstimate = '<div class="main-text"><div class="main-estimate">$' + Math.round(result/12) + ' / mo</div><div class="main-sqft-estimate">$' + Math.ceil((result/sqft) * 100) / 100 + ' / sqft</div><div class="main-info-box"><div class="bedrooms">'+ metaData.res[index].bedrooms +' bds</div><div class="bathrooms">'+ metaData.res[index].bathrooms +' ba</div><div class="sqft">'+ metaData.res[index].finishedSqFt +' sqft</div></div><div class="main-address"><div class="address-street">' + address.street + ', ' + '</div><div class="address-city">' + ' ' + address.city + ',' + '</div><div class="address-state">' + ' ' + address.state
    + '</div><button class="link-to-zillow"><a href="'+ metaData.res[index].links.homedetails +'">View On Zillow</a></button></div></div>';

    var thumbnailEstimate = '<div class="thumbnail-estimate">$' + Math.round(result/12) + ' / mo</div><div class="thumbnail-sqft-estimate">$' + Math.ceil((result/sqft) * 100) / 100 + ' / sqft</div>';
    return type === 'main' ? mainEstimate : thumbnailEstimate;
  };

  // buildImageUrls collects addresses from all returned homes and creates URL for GET request to google streetviews
  var buildImageUrls = (res) => {
    response = res.dataList.res;
    var allImages = '';
    response.forEach( (home, index) => {
      var street = home.address.street.split(' ').join('+');
      var city = home.address.city.split(' ').join('+');
      var state = home.address.state;
      var imageUrl;
      var main_section = $('.home-results');
      var thumbnail_section = $('.thumbnail-data-row');

      mainText = buildHomeInfo(res, index, 'main');
      thumbText = buildHomeInfo(res, index, 'thumb');
      var mainImage = 'https://maps.googleapis.com/maps/api/streetview?size=640x400&location=' + street + '&citystatezip=' + city + '%2C+' + state + '&key=AIzaSyDpJs9djR5SYTF-27J087X4qpSXZDuNOpk';
      var mainImageUrl = '<div class="main-search-homeImage col-lg-8 col-md-8 col-sm-8 col-xs-12" id='+ index +'>' + mainText + '<div class="main-overlay"></div><img class="main-image" src=' + mainImage + '></div>';

      var thumbnailImage = 'https://maps.googleapis.com/maps/api/streetview?size=640x400&location=' + street + '&citystatezip=' + city + '%2C+' + state + '&key=AIzaSyDpJs9djR5SYTF-27J087X4qpSXZDuNOpk';
      var thumbnailImageUrl = '<div id=' + index + ' class="thumbnail col-md-4 col-lg-4 col-sm-4 col-xs-2"><div id=thumbnail-text-' + index + ' class="image-text">' + thumbText + '</div><div class="thumbnail-overlay"></div><img class="thumbnail-image" src=' + thumbnailImage + '></div>';

      appState.mainImages.push(mainImageUrl);
      appState.thumbnailImages.push(thumbnailImageUrl);
      index === 0 ? allImages += mainImageUrl : allImages += thumbnailImageUrl;
    });
    $('.thumbnail-data-row').hide().append(allImages);
    setTimeout( () => {
      initMap(response);
      $('.thumbnail-data-row').fadeIn();
    }, 2000);
  };

  // clears search state when new search is initiated
  var onNewSearch = () => {
    $('.loading-homes').fadeIn();
    console.log($('.loading-homes'));
    $('.home-results').empty();
    $('.map').empty();
    $('.map').removeClass('.map-box');
    $('.thumbnail-data-row').empty();
    appState.mainImages = [];
    appState.thumbnailImages = [];
    appState.markers = {};
  };

  // swaps main and thumbnail info / image blocks when clicked to display more / less info
  $('.thumbnail-data-row').on('click', '.thumbnail', (e) => {
    let main = $('.main-search-homeImage');
    let thumb = $(e.currentTarget);
    let thumbId = thumb.attr('id');
    let mainId = main.attr('id');
    $('.thumbnail-data-row #' + thumbId + '').replaceWith(appState.thumbnailImages[mainId]);
    $('.thumbnail-data-row #' + mainId + '').replaceWith(appState.mainImages[thumbId]);
  });

  $('.title').click( () => {
    history.go(-1);
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


// creates new google maps instance when API returns location of primary and comparable home data
var initMap = (res) => {
  $('.map').addClass('.map-box');
  var mapHeight = $('.thumbnail-data-row').height();
  $('.map').css('height', mapHeight);
  var map = new GMaps({
    div: '.map',
    lat: res[0].address.latitude,
    lng: res[0].address.longitude,
    zoom: 12
  });
  res.forEach( (pos, index) => {
    if(index === 0) {
      var marker = map.createMarker({
        lat: pos.address.latitude,
        lng: pos.address.longitude,
        icon: 'static/assets/townhouse.png'
      });
      appState.markers[index] = [marker];
      map.addMarker(marker);
    } else {
      var marker = map.createMarker({
        lat: pos.address.latitude,
        lng: pos.address.longitude,
        icon: 'static/assets/house.png',
        mouseover: (e) => {
          mouseOverMarker(index);
        },
        mouseout: (e) => {
          mouseOutMarker(index);
        },
        click: (e) => {
          clickHouse(index);
        }
      });
      appState.markers[index] = [marker];
      map.addMarker(marker);
    }
  });
  console.log(appState);
}

/***********************************
  Map Marker mouseover functions
***********************************/

var mouseOverMarker = (index) => {
  $('#' + index).addClass('thumbnail-mouseover');
};

var mouseOutMarker = (index) => {
  $('#' + index).removeClass('thumbnail-mouseover');
}

var clickHouse = (index) => {
  let main = $('.main-search-homeImage');
  let mainId = main.attr('id');
  $('.thumbnail-data-row #' + index + '').replaceWith(appState.thumbnailImages[mainId]);
  $('.thumbnail-data-row #' + mainId + '').replaceWith(appState.mainImages[index]);
}

/*********************************
*********************************/
