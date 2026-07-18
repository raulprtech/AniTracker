async function run() {
  const r1 = await fetch('https://api.jikan.moe/v4/seasons/now?page=1').then(r=>r.json());
  const r2 = await fetch('https://api.jikan.moe/v4/seasons/now?page=2').then(r=>r.json());
  console.log('page 1:', r1.data ? r1.data.length : 'error');
  console.log('page 1 next:', r1.pagination?.has_next_page);
  console.log('page 2:', r2.data ? r2.data.length : 'error');
  console.log('page 2 next:', r2.pagination?.has_next_page);
}
run();
