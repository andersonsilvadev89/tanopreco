export const DEFAULT_PRODUTOS_DISPONIVEIS = 5;
export const DEFAULT_DESTAQUES_DISPONIVEIS = 0;

export function buildSocialUserProfile(loggedUser: any, existingUser: Record<string, any> = {}) {
  const defaultNome =
    loggedUser.displayName?.trim() ||
    (loggedUser.email ? loggedUser.email.split('@')[0] : 'Usuario');

  const nomeAtual = typeof existingUser?.nome === 'string' && existingUser.nome.trim()
    ? existingUser.nome.trim()
    : defaultNome;

  const telefoneAtual = typeof existingUser?.telefone === 'string' ? existingUser.telefone.trim() : null;
  const imagemAtual = typeof existingUser?.imagem === 'string' && existingUser.imagem.trim()
    ? existingUser.imagem.trim()
    : (loggedUser.photoURL || null);

  const instagramAtual = typeof existingUser?.instagram === 'string' ? existingUser.instagram.trim() : null;
  const cpfAtual = typeof existingUser?.cpf === 'string' ? existingUser.cpf.trim() : null;
  const cnpjAtual = typeof existingUser?.cnpj === 'string' ? existingUser.cnpj.trim() : null;
  const palavrasChaveAtual = typeof existingUser?.palavrasChave === 'string' ? existingUser.palavrasChave.trim() : '';
  const nomeEmpresaAtual = typeof existingUser?.nomeEmpresa === 'string' ? existingUser.nomeEmpresa.trim() : '';

  return {
    nome: nomeAtual,
    nomeEmpresa: nomeEmpresaAtual,
    email: loggedUser.email || existingUser.email || '',
    telefone: telefoneAtual,
    instagram: instagramAtual,
    imagem: imagemAtual,
    cpf: cpfAtual,
    cnpj: cnpjAtual,
    palavrasChave: palavrasChaveAtual,
    produtosDisponiveis: typeof existingUser?.produtosDisponiveis === 'number'
      ? existingUser.produtosDisponiveis
      : DEFAULT_PRODUTOS_DISPONIVEIS,
    destaquesDisponiveis: typeof existingUser?.destaquesDisponiveis === 'number'
      ? existingUser.destaquesDisponiveis
      : DEFAULT_DESTAQUES_DISPONIVEIS,
    termosAceitos: existingUser?.termosAceitos ?? true,
    latitude: existingUser?.latitude ?? null,
    longitude: existingUser?.longitude ?? null,
    status: existingUser?.status || 'ativo',
    criadoEm: existingUser?.criadoEm || Date.now(),
  };
}
