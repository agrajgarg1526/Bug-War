function date(diff) {
  
  diff = Date.now() - diff;
  
  var months = Math.floor(diff / 1000 / 60 / (60 * 24 * 31));
 
  var days = Math.floor(diff / 1000 / 60 / (60 * 24));
  console.log(days);
  var msec = diff;
  var hours = Math.floor(msec / 1000 / 60 / 60);
  msec -= hours * 1000 * 60 * 60;
  var minutes = Math.floor(msec / 1000 / 60);
  msec -= months * 1000 * 60;

  if (months > 0) {
    if (months == 1) return months + " month ago";
    else if (months >= 12) {
      if (months % 12 === 0 && months === 12) return "1 year ago";
      else if (months % 12 == 0)
        return months / 12 + " year, " + (months % 12) + " months ago";
    } else return months + " months ago";
  } else if (days > 0) {
    if (days == 1) return days + " day ago";
    else return days + " days ago";
  } else {
    if (hours > 0) {
      if (hours == 1) return hours + " hour ago";
      else return hours + " hours ago";
    } else {if(minutes==0) return "";
      else if (minutes == 1) return minutes + " minute ago";
      else return minutes + " minutes ago";
    }
  }
}

module.exports = {
  date: date,
};
