
function Flow(generator) {

	var instance = generator(cb);

	function cb(argument) {

		//try {

			return instance.next(arguments);

		//}
		//catch(err) {

			//console.error(err);

		//}

	}

	instance.next();

}

module.exports.Flow = Flow;
