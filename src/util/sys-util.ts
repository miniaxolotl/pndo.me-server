var os = require('os');
import disk from 'diskusage';

let path = os.platform() === 'win32' ? 'c:' : '/';

let last_idle = 0;
let last_usage = 0;

export const system_usage = async () => {
	const usage_data = {
		memory_usage: (1 - (os.freemem() / os.totalmem())),
		cpu_usage: 0,
		disk_usage: 0,
		cpus: {},
	};
	
	const cpu_list = Array();
	const cpus = os.cpus();
	let idle = 0;
	let usage = 0;

	cpus.forEach((item, index) => {
		usage += item.times.user;
		usage += item.times.nice;
		usage += item.times.sys;
		usage += item.times.idle;
		usage += item.times.irq;

		const data = {
			speed: item.speed,
			cpu: {
				usage,
				idle,
			},
			memory: {
				total: os.totalmem(),
				free: os.freemem(),
			},
		}

		cpu_list.push(data);

		idle += item.times.idle;
	});

	
	try {
		const disk_data = await disk.check(path);
		usage_data.disk_usage =
			(disk_data.total - disk_data.free) / disk_data.total;
	} catch (err) {
		console.error(err)
	}

	usage_data.cpu_usage = (1 - (idle - last_idle) / (usage - last_usage));
	usage_data.cpus = cpu_list;

	last_idle = idle;
	last_usage = usage;

	return usage_data;
}