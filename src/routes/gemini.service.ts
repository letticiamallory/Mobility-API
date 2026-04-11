import { Injectable, Logger } from '@nestjs/common';

interface GeminiPart {
  text?: string;
  inline_data?: {
    mime_type: string;
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

  async analyzeAccessibility(imageUrl: string): Promise<{
    accessible: boolean;
    warning: string | null;
  }> {
    try {
      const apiKey = process.env.GEMINI_API_KEY ?? '';

      const imageResponse = await fetch(imageUrl);
      if (!imageResponse.ok) {
        throw new Error(`Falha ao buscar imagem: ${imageResponse.status}`);
      }
      const imageBuffer = await imageResponse.arrayBuffer();
      const base64Image = Buffer.from(imageBuffer).toString('base64');

      const parts: GeminiPart[] = [
        {
          inline_data: {
            mime_type: 'image/jpeg',
            data: base64Image,
          },
        },
        {
          text: 'Você é um especialista em acessibilidade urbana para cadeirantes. Analise esta imagem de rua e responda APENAS em JSON: {"accessible": true/false, "warning": "descrição objetiva do problema em português ou null"}. INACESSÍVEL (accessible: false) se houver: escadas ou degraus sem rampa alternativa visível, calçada completamente ausente obrigando caminhar na rua, obras/areia/entulho/andaimes bloqueando a passagem, vegetação/postes/lixeiras/mobiliário urbano bloqueando mais de 50% da calçada, calçada muito estreita com menos de 1,2 metro de espaço livre, buracos profundos ou afundamentos graves, rampa com inclinação claramente excessiva, veículos estacionados bloqueando completamente a calçada. ACESSÍVEL (accessible: true) se houver: calçada livre e transitável mesmo que imperfeita, pequenas irregularidades ou pedra portuguesa, ausência de rampa em meio-fio isolada, superfície levemente inclinada ou desgastada, obstáculos pequenos que não bloqueiam a passagem.',
        },
      ];

      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ contents: [{ parts }] }),
        },
      );

      if (!response.ok) {
        throw new Error(`Gemini API error: ${response.status}`);
      }

      const data = (await response.json()) as GeminiResponse;

      const text = data.candidates?.[0]?.content?.parts?.[0]?.text ?? '';

      try {
        const clean = text.replace(/```json|```/g, '').trim();
        const result = JSON.parse(clean) as {
          accessible: boolean;
          warning: string | null;
        };
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
