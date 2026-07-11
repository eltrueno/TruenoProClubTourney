import puppeteer, { Browser, Page } from 'puppeteer'
import os from 'os'
import { IRespWrap } from '../model/club'

const API_URL = 'https://proclubs.ea.com/api/fc/'
export type TPlatformType = ('common-gen4' | 'common-gen5' | 'nx')

export const isPlatformType = (pType: unknown): pType is TPlatformType =>
	pType === 'common-gen4' || pType === 'common-gen5' || pType === 'nx'

function* values2<T extends Record<string, any>>(obj: T) {
	for (const prop of Object.keys(obj)) {
		yield obj[prop]
	}
}

class BrowserManager {
	private static browser: Browser | null = null;
	private static page: Page | null = null;

	static async getPage(): Promise<Page> {
		if (!this.browser) {
			console.log('🌐 Iniciando navegador...');

			const isWindows = os.platform() === 'win32';

			this.browser = await puppeteer.launch({
				headless: true,
				executablePath: process.env.PUPPETEER_EXECUTABLE_PATH
					|| (isWindows
						? 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
						: '/usr/bin/google-chrome-stable'),
				args: [
					'--no-sandbox',
					'--disable-setuid-sandbox',
					'--disable-dev-shm-usage',
					'--disable-gpu'
				]
			});

			console.log('✅ Navegador iniciado');
		}

		if (!this.page) {
			this.page = await this.browser.newPage();

			// User agent
			await this.page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36');

			// Visitar la página principal para obtener cookies
			console.log('🔄 Obteniendo cookies de EA...');
			await this.page.goto('https://proclubs.ea.com/', {
				waitUntil: 'networkidle0',
				timeout: 15000
			});
			console.log('✅ Cookies obtenidas');
		}

		return this.page;
	}

	static async close() {
		if (this.page) {
			await this.page.close();
			this.page = null;
		}
		if (this.browser) {
			await this.browser.close();
			this.browser = null;
		}
	}
}

const _getExt = async <T>(platform: TPlatformType, route: string, params: Record<string, unknown>) => {
	const page = await BrowserManager.getPage();

	try {
		params = { ...params, platform };

		const url = new URL(`${API_URL}${route}`);
		Object.entries(params).forEach(([key, value]) => {
			url.searchParams.append(key, String(value));
		});

		console.log('📡 Request:', url.toString());

		// Ejecutar fetch DENTRO del navegador (usa sus cookies automáticamente)
		const data = await page.evaluate(async (apiUrl) => {
			try {
				const response = await fetch(apiUrl, {
					method: 'GET',
					headers: {
						'Accept': 'application/json',
						'Referer': 'https://proclubs.ea.com/'
					}
				});

				if (!response.ok) {
					throw new Error(`HTTP ${response.status}: ${response.statusText}`);
				}

				return await response.json();
			} catch (error: any) {
				throw new Error(`Fetch error: ${error.message}`);
			}
		}, url.toString());

		console.log('✅ Success');
		const r: T[] = Array.from(values2(data as IRespWrap<T>));
		return r;

	} catch (e: any) {
		console.error('❌ Error:', e.message);
		throw e;
	}
}

const _get = async <T>(platform: TPlatformType, route: string, params: Record<string, unknown>) =>
	(await _getExt<T>(platform, route, params))?.[0]

export const get = (platform: TPlatformType, route: string) => _get(platform, route, {})
export const getExt = <T>(platform: TPlatformType, route: string) => _getExt<T>(platform, route, {})
export const getParam = <T>(platform: TPlatformType, route: string, params: Record<string, unknown>) =>
	_get<T>(platform, route, params)
export const getParamExt = <T>(platform: TPlatformType, route: string, params: Record<string, unknown>) => {
	params = { ...params }
	return _getExt<T>(platform, route, params)
}
export const getNoParam = <T>(platform: TPlatformType, route: string) => _getExt<T>(platform, route, {})

process.on('SIGINT', async () => {
	console.log('🛑 Cerrando navegador...');
	await BrowserManager.close();
	process.exit();
});

process.on('SIGTERM', async () => {
	console.log('🛑 Cerrando navegador...');
	await BrowserManager.close();
	process.exit();
});