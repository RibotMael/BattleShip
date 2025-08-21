
fetch('http://localhost:3000/api/ping')
  .then(res => res.json())
  .then(data => console.log(data));
