function date(val) {
  if (!val) return '';
  var d = new Date(val);
  return d.toLocaleDateString('en-GB');
}