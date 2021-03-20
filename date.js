function date(diff) {
  diff = Date.now() - diff;
  var days = Math.floor(diff / 1000 / 60 / (60 * 24));

  var msec = diff;
  var hh = Math.floor(msec / 1000 / 60 / 60);
  msec -= hh * 1000 * 60 * 60;
  var mm = Math.floor(msec / 1000 / 60);
  msec -= mm * 1000 * 60;

  if (days > 0) {
    if(days==1 ) return days + " day ago";
    else return days + " days ago";
  } else {
    if (hh > 0) {
      if (hh == 1) return hh + " hour ago";
      else return hh + " hours ago";
    } else {
      if(mm==1) mm + " minute ago";
      else return mm + " minutes ago";
    }
  }
}

module.exports = {
  date: date,
};
