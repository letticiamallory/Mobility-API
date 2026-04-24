import { Injectable, Logger } from '@nestjs/common';

interface GeminiPart {
  text?: string;
  inlineData?: {
    mimeType: string;
    data: string;
  };
}

interface GeminiResponse {
  candidates: {
    content: {
      parts: { text: string }[];
    };
  }[];
}

@Injectable()
export class GeminiService {
  private readonly logger = new Logger(GeminiService.name);

  private getGoogleMapsApiKey(): string {
    return process.env.GOOGLE_MAPS_API_KEY ?? process.env.GOOGLE_API_KEY ?? '';
  }

  private async getStreetViewImages(lat: number, lng: number): Promise<string[]> {
    const apiKey = this.getGoogleMapsApiKey();
    const size = '640x400';
    const headings = [0, 90, 180, 270];

    const urls = headings.map(
      (heading) =>
        `https://maps.googleapis.com/maps/api/streetview?size=${size}&location=${lat},${lng}&heading=${heading}&pitch=0&key=${apiKey}`,
    );

    const results: string[] = [];
    for (const url of urls) {
      try {
        const metaUrl = url.replace('streetview?', 'streetview/metadata?');
        const meta = await fetch(metaUrl);
        const json = (await meta.json()) as { status?: string };
        if (json.status === 'OK') {
          results.push(url);
        }
      } catch {
        // ignora erros individuais
      }
    }
    return results;
  }

  private async check3DTilesAvailability(
    lat: number,
    lng: number,
  ): Promise<boolean> {
    try {
      const apiKey = this.getGoogleMapsApiKey();
      const url = `https://tile.googleapis.com/v1/3dtiles/root.json?key=${apiKey}`;
      const response = await fetch(url);
      if (!response.ok) return false;

      // Verifica se existe tile para as coordenadas aproximadas
      const zoom = 14;
      const x = Math.floor(((lng + 180) / 360) * Math.pow(2, zoom));
      const y = Math.floor(
        ((1 -
          Math.log(
            Math.tan((lat * Math.PI) / 180) + 1 / Math.cos((lat * Math.PI) / 180),
          ) /
            Math.PI) /
          2) *
          Math.pow(2, zoom),
      );

      const tileUrl = `https://tile.googleapis.com/v1/3dtiles/${zoom}/${x}/${y}.glb?key=${apiKey}`;
      const tileResponse = await fetch(tileUrl, { method: 'HEAD' });
      return tileResponse.ok;
    } catch {
      return false;
    }
  }

  private async getBestImages(
    lat: number,
    lng: number,
  ): Promise<{ images: string[]; source: '3dtiles' | 'streetview' }> {
    const has3DTiles = await this.check3DTilesAvailability(lat, lng);

    if (has3DTiles) {
      const apiKey = this.getGoogleMapsApiKey();
      // Retorna URL de screenshot do 3D Tiles via Maps Static API com perspectiva
      const images = [
        `https://maps.googleapis.com/maps/api/staticmap?center=${lat},${lng}&zoom=18&size=640x400&maptype=satellite&key=${apiKey}`,
        `https://maps.googleapis.com/maps/api/staticmap?center=${lat},${lng}&zoom=17&size=640x400&maptype=satellite&key=${apiKey}`,
      ];
      return { images, source: '3dtiles' };
    }

    const streetViewImages = await this.getStreetViewImages(lat, lng);
    if (streetViewImages.length > 0) {
      return { images: streetViewImages, source: 'streetview' };
    }

    // Fallback final: satélite estático
    const apiKey = this.getGoogleMapsApiKey();
    return {
      images: [
        `https://maps.googleapis.com/maps/api/staticmap?center=${lat},${lng}&zoom=18&size=640x400&maptype=satellite&key=${apiKey}`,
      ],
      source: 'streetview',
    };
  }

  private async sleep(ms: number): Promise<void> {
    await new Promise((resolve) => setTimeout(resolve, ms));
  }

  private async callGeminiWithModel(
    model:
      | 'gemini-2.5-flash-lite'
      | 'gemini-2.5-flash',
    apiKey: string,
    parts: GeminiPart[],
  ): Promise<GeminiResponse> {
    console.log('Calling Gemini model:', model);
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': apiKey,
        },
        body: JSON.stringify({ contents: [{ parts }] }),
      },
    );

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(
        `Gemini API error [${model}]: ${response.status} ${response.statusText} - ${errorBody}`,
      );
    }

    this.logger.log(`Gemini model used successfully: ${model}`);
    return (await response.json()) as GeminiResponse;
  }

  async analyzeAccessibility(imageUrl: string): Promise<{
    accessible: boolean;
    warning: string | null;
  }> {
    try {
      const apiKey = process.env.GEMINI_API_KEY ?? '';
      const location = new URL(imageUrl).searchParams.get('location') ?? '';
      const [latRaw, lngRaw] = location.split(',');
      const lat = Number(latRaw);
      const lng = Number(lngRaw);
      const { images, source } = await this.getBestImages(lat, lng);
      this.logger.log(
        `Gemini image source selected: ${source} (${images.length} candidates)`,
      );

      const imagePrompt =
        source === '3dtiles'
          ? 'Analise esta imagem de satélite de alta resolução e avalie a acessibilidade do trecho para pessoas com deficiência. Identifique calçadas, rampas, obstáculos, faixas de pedestre e condições do pavimento.'
          : 'Analise estas imagens de Street View e avalie a acessibilidade do trecho para pessoas com deficiência. Identifique calçadas, rampas, obstáculos, faixas de pedestre e condições do pavimento.';

      const validImageParts: GeminiPart[] = [];
      for (const url of images) {
        await this.sleep(1000);
        const response = await fetch(url);
        if (!response.ok) {
          throw new Error(`Falha ao buscar imagem (${response.status}): ${url}`);
        }
        const buffer = await response.arrayBuffer();
        if (buffer.byteLength < 1000) {
          this.logger.warn(
            `Imagem descartada por tamanho inválido (${buffer.byteLength} bytes): ${url}`,
          );
          continue;
        }
        const contentType = response.headers.get('content-type') ?? '';
        const mimeType = contentType.includes('image/png')
          ? 'image/png'
          : 'image/jpeg';
        const base64 = Buffer.from(buffer).toString('base64');
        validImageParts.push({
          inlineData: {
            mimeType,
            data: base64,
          },
        });
      }
      if (validImageParts.length === 0) {
        throw new Error('Nenhuma imagem válida para enviar ao Gemini');
      }

      const parts: GeminiPart[] = [
        {
          text: `${imagePrompt} Você é um especialista em acessibilidade urbana para cadeirantes. Responda APENAS em JSON: {"accessible": true/false, "warning": "descrição objetiva do problema em português ou null"}. INACESSÍVEL (accessible: false) se houver: escadas ou degraus sem rampa alternativa visível, calçada completamente ausente obrigando caminhar na rua, obras/areia/entulho/andaimes bloqueando a passagem, vegetação/postes/lixeiras/mobiliário urbano bloqueando mais de 50% da calçada, calçada muito estreita com menos de 1,2 metro de espaço livre, buracos profundos ou afundamentos graves, rampa com inclinação claramente excessiva, veículos estacionados bloqueando completamente a calçada. ACESSÍVEL (accessible: true) se houver: calçada livre e transitável mesmo que imperfeita, pequenas irregularidades ou pedra portuguesa, ausência de rampa em meio-fio isolada, superfície levemente inclinada ou desgastada, obstáculos pequenos que não bloqueiam a passagem.`,
        },
        ...validImageParts,
      ];

      let data: GeminiResponse;
      try {
        data = await this.callGeminiWithModel('gemini-2.5-flash-lite', apiKey, parts);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        if (!message.includes(' 429 ')) {
          throw error;
        }

        this.logger.warn(
          'Gemini 2.0 retornou 429, tentando fallback para gemini-1.5-flash',
        );
        try {
          data = await this.callGeminiWithModel(
            'gemini-2.5-flash',
            apiKey,
            parts,
          );
        } catch (fallbackError) {
          const fallbackMessage =
            fallbackError instanceof Error
              ? fallbackError.message
              : String(fallbackError);

          if (fallbackMessage.includes(' 429 ')) {
            this.logger.warn(
              'Gemini 1.5 também retornou 429, aguardando 2s para último retry',
            );
            await this.sleep(2000);
            throw fallbackError;
          } else {
            throw fallbackError;
          }
        }
      }

      const text = data.candidates?.[0]?.content?.parts?.[0]?.text ?? '';

      try {
        const clean = text.replace(/```json|```/g, '').trim();
        const parsed = JSON.parse(clean) as
          | { accessible: boolean; warning: string | null }
          | Array<{ accessible: boolean; warning: string | null }>;

        const result = Array.isArray(parsed)
          ? {
              accessible: parsed.every((item) => item.accessible),
              warning:
                parsed.find((item) => item.warning)?.warning ??
                (parsed.every((item) => item.accessible)
                  ? null
                  : 'Possível obstáculo identificado nesse trecho - avalie se consegue passar ou prefira uma alternativa'),
            }
          : parsed;
        this.logger.log(`Gemini result: ${JSON.stringify(result)}`);
        return result;
      } catch {
        this.logger.warn(
          'Falha ao parsear resposta do Gemini — assumindo acessível',
        );
        return { accessible: true, warning: null };
      }
    } catch (error) {
      this.logger.error(`Erro no GeminiService: ${(error as Error).message}`);
      return { accessible: true, warning: null };
    }
  }
}
