async function one() {
  try {
    const res = await fetch(process.env.TUTOR_LLM_BASE_URL + "/models", { headers: { authorization: "Bearer " + process.env.TUTOR_LLM_API_KEY } });
    return res.status === 200;
  } catch (e) {
    return false;
  }
}
Promise.all(Array.from({ length: 8 }, () => one())).then((r) => {
  console.log(`pid ${process.pid}: ${r.filter(Boolean).length}/8 ok`);
});
