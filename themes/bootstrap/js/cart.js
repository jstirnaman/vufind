/*global Cookies, path, vufindString, Lightbox */

var _CART_COOKIE = 'vufind_cart';
var _CART_COOKIE_SOURCES = 'vufind_cart_src';
var _CART_COOKIE_DELIM = "\t";

var currentId,currentSource;

function getCartItems() {
  var items = Cookies.getItem(_CART_COOKIE);
  if(items) {
    return items.split(_CART_COOKIE_DELIM);
  }
  return [];
}
function getCartSources() {
  var items = Cookies.getItem(_CART_COOKIE_SOURCES);
  if(items) {
    return items.split(_CART_COOKIE_DELIM);
  }
  return [];
}
function getFullCartItems() {
  var items = getCartItems();
  var sources = getCartSources();
  var full = [];
  if(items.length == 0) {
    return [];
  }
  for(var i=items.length;i--;) {
    full[full.length] = sources[items[i].charCodeAt(0)-65]+'|'+items[i].substr(1);
  }
  return full;
}

function addItemToCart(id,source) {
  if(!source) {
    source = 'VuFind';
  }
  var cartItems = getCartItems();
  var cartSources = getCartSources();
  var sIndex = cartSources.indexOf(source);
  if(sIndex < 0) {
    // Add source to source cookie
    cartItems[cartItems.length] = String.fromCharCode(65+cartSources.length) + id;
    cartSources[cartSources.length] = source;
    Cookies.setItem(_CART_COOKIE_SOURCES, cartSources.join(_CART_COOKIE_DELIM), false, '/');
  } else {
    cartItems[cartItems.length] = String.fromCharCode(65+sIndex) + id;
  }
  Cookies.setItem(_CART_COOKIE, $.unique(cartItems).join(_CART_COOKIE_DELIM), false, '/');
  $('#cartItems strong').html(parseInt($('#cartItems strong').html(), 10)+1);
  return true;
}
function uniqueArray(op) {
  var ret = [];
  for(var i=0;i<op.length;i++) {
    if(ret.indexOf(op[i]) < 0) {
      ret.push(op[i]);
    }
  }
  return ret;
}
function removeItemFromCart(id,source) {
  var cartItems = getCartItems();
  var cartSources = getCartSources();
  // Find 
  var cartIndex = cartItems.indexOf(String.fromCharCode(65+cartSources.indexOf(source))+id);
  if(cartIndex > -1) {
    var sourceIndex = cartItems[cartIndex].charCodeAt(0)-65;
    var cartItem = cartItems[cartIndex];
    var saveSource = false;
    for(var i=cartItems.length;i--;) {
      if(i==cartIndex) {
        continue;
      }
      // If this source is shared by another, keep it
      if(cartItems[i].charCodeAt(0)-65 == sourceIndex) {
        saveSource = true;
        break;
      }
    }
    cartItems.splice(cartIndex,1);
    // Remove unused sources
    if(!saveSource) {
      var oldSources = cartSources.slice(0);
      cartSources.splice(sourceIndex,1);
      // Adjust source index characters
      for(var j=cartItems.length;j--;) {
        var si = cartItems[j].charCodeAt(0)-65;
        var ni = cartSources.indexOf(oldSources[si]);
        cartItems[j] = String.fromCharCode(65+ni)+cartItems[j].substring(1);
      }
    }
    if(cartItems.length > 0) {
      Cookies.setItem(_CART_COOKIE, uniqueArray(cartItems).join(_CART_COOKIE_DELIM), false, '/');
      Cookies.setItem(_CART_COOKIE_SOURCES, uniqueArray(cartSources).join(_CART_COOKIE_DELIM), false, '/');
    } else {
      Cookies.removeItem(_CART_COOKIE, '/');
      Cookies.removeItem(_CART_COOKIE_SOURCES, '/');
    }
    $('#cartItems strong').html(parseInt($('#cartItems strong').html(), 10)-1);
    return true;
  }
  return false;
}
function registerUpdateCart($form) {
  if($form) {
    $("#updateCart, #bottom_updateCart").unbind('click').click(function(){
      var elId = this.id;
      var selectedBoxes = $("input[name='ids[]']:checked", $form);
      var selected = [];
      $(selectedBoxes).each(function(i) {
        selected[i] = this.value;
      });
      if (selected.length > 0) {
        var inCart = 0;
        var msg = "";
        var orig = getFullCartItems();
        $(selected).each(function(i) {
          for (var x in orig) {
            if (this == orig[x]) {
              inCart++;
              return;
            }
          }
          var data = this.split('|');
          addItemToCart(data[1], data[0]);
        });
        var updated = getFullCartItems();
        var added = updated.length - orig.length;
        msg += added + " " + vufindString.itemsAddBag + "\n\n";
        if (inCart > 0 && orig.length > 0) {
          msg += inCart + " " + vufindString.itemsInBag + "\n\n";
        }
        if (updated.length >= vufindString.bookbagMax) {
          msg += vufindString.bookbagFull;
        }
        $('#'+elId).popover({content:msg}).popover('show');
        $('#cartItems strong').html(updated.length);
      } else {
        $('#'+elId).popover({content:vufindString.bulk_noitems_advice}).popover('show');
      }
      return false;
    });
  }
}

// Ajax cart submission for the lightbox
var lastCartSubmit = false;
function cartSubmit($form) {
  lastCartSubmit = $form;
  var submit = $form.find('input[type="submit"][clicked=true]').attr('name');
  if (submit == 'print') {
    //redirect page
    var checks = $form.find('input.checkbox-select-item:checked');
    if(checks.length > 0) {
      var url = path+'/Records/Home?print=true';
      for(var i=0;i<checks.length;i++) {
        url += '&id[]='+checks[i].value;
      }
      document.location.href = url;
    } else {
      Lightbox.displayError(vufindString['bulk_noitems_advice']);
    }
  } else {
    Lightbox.submit($form, Lightbox.changeContent);
  }
}

$(document).ready(function() {
  // Record buttons
  var cartId = $('#cartId');
  if(cartId.length > 0) {
    cartId = cartId.val().split('|');
    currentId = cartId[1];
    currentSource = cartId[0];
    $('#cart-add.correct,#cart-remove.correct').removeClass('correct hidden');
    $('#cart-add').click(function() {
      addItemToCart(currentId,currentSource);
      $('#cart-add,#cart-remove').toggleClass('hidden');
    });
    $('#cart-remove').click(function() {
      removeItemFromCart(currentId,currentSource);
      $('#cart-add,#cart-remove').toggleClass('hidden');
    });
  } else {
    // Search results
    var $form = $('form[name="bulkActionForm"]');
    registerUpdateCart($form);
  }
  
  // Setup lightbox behavior
  // Cart lightbox
  $('#cartItems').click(function() {
    return Lightbox.get('Cart','Cart');
  });
  // Overwrite 
  Lightbox.addFormCallback('accountForm', function() {
    updatePageForLogin();
    if (lastCartSubmit !== false) {
      cartSubmit(lastCartSubmit);
      lastCartSubmit = false;
    } else {
      Lightbox.getByUrl(Lightbox.openingURL);
      Lightbox.openingURL = false;
    }
  });
  Lightbox.addFormHandler('cartForm', function(evt) {
    cartSubmit($(evt.target));
    return false;
  });
  Lightbox.addFormCallback('bulkEmail', function() {
    Lightbox.confirm(vufindString['bulk_email_success']);
  });
  Lightbox.addFormCallback('bulkSave', function() {
    // After we close the lightbox, redirect to list view
    Lightbox.addCloseAction(function() {
      document.location.href = path+'/MyResearch/MyList/'+Lightbox.lastPOST['list'];
    });
    Lightbox.confirm(vufindString['bulk_save_success']);
  });
  Lightbox.addFormHandler('exportForm', function(evt) {
    $.ajax({
      url: path + '/AJAX/JSON?' + $.param({method:'exportFavorites'}),
      type:'POST',
      dataType:'json',
      data:Lightbox.getFormData($(evt.target)),
      success:function(data) {
        if(data.data.needs_redirect) {
          document.location.href = data.data.result_url;
        } else {
          Lightbox.changeContent(data.data.result_additional);
        }
      },
      error:function(d,e) {
        //console.log(d,e); // Error reporting
      }
    });
    return false;
  });
  Lightbox.addCloseAction(function() {
    // Update cart items (add to cart, remove from cart, cart lightbox interface)
    var cartCount = $('#cartItems strong');
    if(cartCount.length > 0) {
      var cart = getFullCartItems();
      var id = $('#cartId');
      if(id.length > 0) {
        id = id.val();
        $('#cart-add,#cart-remove').addClass('hidden');
        if(cart.indexOf(id) > -1) {
          $('#cart-remove').removeClass('hidden');
        } else {
          $('#cart-add').removeClass('hidden');
        }
      }
      cartCount.html(cart.length);
    }
  });
});
