import { createGoogleGenerativeAI } from '@ai-sdk/google'; // Cambiamos esto
import { streamObject } from 'ai';
import { z } from 'zod';

export const maxDuration = 60;

export async function POST(req: Request) {
    const { prompt } = await req.json();

    // 1. Configuramos el proveedor con la API Key manualmente
    const google = createGoogleGenerativeAI({
        apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY,
    });

    const result = await streamObject({
        // 2. Usamos la instancia 'google' creada arriba
        model: google('gemini-2.5-flash'),
        schema: z.object({
            labels: z.array(z.object({
                name: z.string().describe("Nombre del producto (ej: FRUTOS ROJOS)"),
                prop1: z.string().describe("Propiedad izquierda (ej: ELEVA LA VIBRACIÓN o LIMPIEZA ENERGETICA)"),
                prop2: z.string().describe("Propiedad derecha (ej: ALIVIA EL RESTRES o PREVIENE ARRUGAS)"),
                type: z.string().describe("Tipo de producto (ej: CORPORAL)"),
            })),
        }),
        prompt,
        system: "Eres un asistente experto en cosmética natural. Tu trabajo es analizar el pedido del usuario y generar una lista de etiquetas para productos. \n" +
            "Reglas:\n" +
            "1. Extrae el ingrediente principal como 'name'.\n" +
            "2. Extrae o infiere 2 propiedades para 'prop1' y 'prop2'.\n" +
            "3. Extrae o infiere el tipo (facial, corporal, capilar) para 'type'.\n" +
            "4. Todo debe estar en MAYÚSCULAS.\n" +
            "5. Si el usuario pide '5 etiquetas variadas', invéntalas.\n" +
            "6. El nombre no debe ser muy largo para caber en el diseño.",
    });

    // 3. Retornamos la respuesta en formato stream
    return result.toTextStreamResponse();
}