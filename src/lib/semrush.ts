export async function getKeywordRankings(domain: string) {
  const response = await fetch(
    `https://api.semrush.com/?type=domain_organic&key=${process.env.SEMRUSH_API_KEY}&display_limit=10&export_columns=Ph,Po,Pp,Pd,Nq,Cp,Ur,Tr,Tc,Co,Nr,Td&domain=${domain}&database=se`
  );
  return response.text();
}

export async function getCompetitorData(domain: string) {
  const response = await fetch(
    `https://api.semrush.com/?type=domain_organic_organic&key=${process.env.SEMRUSH_API_KEY}&display_limit=5&export_columns=Dn,Cr,Np,Or,Ot,Oc,Ad&domain=${domain}&database=se`
  );
  return response.text();
}
