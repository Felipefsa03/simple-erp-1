// ============================================
// clinxia ERP - Utilitários de Compressão
// Otimizado para plano gratuito do Supabase
// ============================================

/**
 * Comprimir imagem antes do upload
 * Reduz tamanho em até 80% mantendo qualidade aceitável
 */
export async function compressImage(
  file: File,
  options: {
    maxWidth?: number;
    maxHeight?: number;
    quality?: number;
    format?: 'jpeg' | 'webp';
  } = {}
): Promise<File> {
  const {
    maxWidth = 800,
    maxHeight = 800,
    quality = 0.7,
    format = 'jpeg'
  } = options;

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        // Calcular dimensões mantendo proporção
        let width = img.width;
        let height = img.height;

        if (width > maxWidth) {
          height = (height * maxWidth) / width;
          width = maxWidth;
        }
        if (height > maxHeight) {
          width = (width * maxHeight) / height;
          height = maxHeight;
        }

        // Criar canvas e comprimir
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Não foi possível criar contexto do canvas'));
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);

        // Converter para blob comprimido
        canvas.toBlob(
          (blob) => {
            if (!blob) {
              reject(new Error('Falha ao comprimir imagem'));
              return;
            }

            // Criar novo arquivo com nome original
            const compressedFile = new File(
              [blob],
              file.name.replace(/\.[^/.]+$/, `.${format}`),
              {
                type: `image/${format}`,
                lastModified: Date.now(),
              }
            );

            console.log(`[Compress] ${file.name}: ${(file.size / 1024).toFixed(1)}KB → ${(compressedFile.size / 1024).toFixed(1)}KB (${((1 - compressedFile.size / file.size) * 100).toFixed(0)}% menor)`);
            resolve(compressedFile);
          },
          `image/${format}`,
          quality
        );
      };
      img.onerror = () => reject(new Error('Falha ao carregar imagem'));
    };
    reader.onerror = () => reject(new Error('Falha ao ler arquivo'));
  });
}

/**
 * Comprimir múltiplas imagens
 */
export async function compressImages(
  files: File[],
  options?: Parameters<typeof compressImage>[1]
): Promise<File[]> {
  const compressed: File[] = [];
  for (const file of files) {
    if (file.type.startsWith('image/')) {
      compressed.push(await compressImage(file, options));
    } else {
      compressed.push(file);
    }
  }
  return compressed;
}

/**
 * Comprimir JSON antes de salvar no banco
 * Remove campos vazios e reduz tamanho
 */
export function compressJSON(obj: any): string {
  // Remover campos vazios, null, undefined
  const clean = (data: any): any => {
    if (Array.isArray(data)) {
      return data.map(clean).filter(item => item !== null && item !== undefined);
    }
    if (data && typeof data === 'object') {
      const cleaned: any = {};
      for (const [key, value] of Object.entries(data)) {
        if (value !== null && value !== undefined && value !== '' && value !== 0 && value !== false) {
          const cleanedValue = clean(value);
          if (cleanedValue !== null && cleanedValue !== undefined) {
            cleaned[key] = cleanedValue;
          }
        }
      }
      return Object.keys(cleaned).length > 0 ? cleaned : null;
    }
    return data;
  };

  const cleaned = clean(obj);
  return JSON.stringify(cleaned);
}

/**
 * Comprimir texto removendo espaços extras
 */
export function compressText(text: string): string {
  if (!text) return '';
  return text
    .trim()
    .replace(/\s+/g, ' ') // Múltiplos espaços → um espaço
    .replace(/\n{3,}/g, '\n\n'); // Múltiplas linhas → duas linhas
}

/**
 * Formatar CPF para salvar compacto (apenas números)
 */
export function compactCPF(cpf: string): string {
  return cpf.replace(/\D/g, '');
}

/**
 * Formatar telefone para salvar compacto
 */
export function compactPhone(phone: string): string {
  return phone.replace(/\D/g, '');
}

