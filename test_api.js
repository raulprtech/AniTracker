fetch('https://api.jikan.moe/v4/seasons/now?limit=5').then(r => r.json()).then(d => {
  if (d.data) {
    console.log(d.data.map(a => a.title).join('\n'));
  } else {
    console.log(d);
  }
}).catch(console.error);
