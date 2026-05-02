import 'server-only';

import OpenAI from 'openai';
import { OPENAI_API_KEY } from './server-config';

export const openai = new OpenAI({
  apiKey: OPENAI_API_KEY
});
