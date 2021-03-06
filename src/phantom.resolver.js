import Resolver from './resolver.js'
import PropertyResolver from './property.resolver.js'

/**
 * Phantom Property Resolver
 * Resolves phantom property to real property based on parent iteration.
 * Phantom properties proceed with a $ and must resolve to an itterable instance
 *
 * Inherits
 *
 * property: data
 * method: detect(data) { return bool }
 */
export default class PhantomResolver extends Resolver {
	constructor(node) {
		super();
		this.node = node;
		this.name = 'phantom';
		this.regex = PhantomResolver.regex();
	}

	/**
	 * resolve()
	 * Resolve data to a property, set any observables on data
	 * @param object object The object that you want to resolve data to
	 */
	resolve(object) {
		var res = PhantomResolver.toProperty(this.data, object, this.node);
		this.resolved = res.resolved;
		this.observers = res.observers;
	}

	/**
	 * static regex()
	 * regex used to test resolvable data on
	 * @return object regex The regex used to validate if of type or not
	 */
	static regex() {
		return /^\${1}[a-zA-Z]{1}[a-zA-Z0-9_]+((\.[a-zA-Z]{1}[a-zA-Z0-9_]+)|(\[([0-9]+|\$?[a-zA-Z_]{1}[a-zA-Z0-9_.\[\'\]]+)\])|(\[\'[^\[\]\']+\'\]))*$/;
	}

	/**
	 * static toProperty()
	 * turns a path and object to a property value, returning list of observers on any found properties
	 * @param string path The path to resolve on the object
	 * @param object object The object to resolve the path on
	 * @param HTMLElement node The node that the property is being generated for (allows look back for phantom)
	 * @return object {resolved: ..., observers:...} The resolved data and any observers needed to track future changes
	 */
	static toProperty(data, object, node) {
	    data = data.trim();
		let dataPhantom = data.split(/\.|\[/).shift();
		let dataPath = data.substring(dataPhantom.length, data.length);

	    var result = {resolved: undefined, observers: []};
	    if (!node || !node.parentNode) return result;

	    // find closest phantom up nodes
	    var sniffed = node;
	    while (sniffed && sniffed.tagName !== 'BODY')
	    {
	    	if (sniffed && sniffed.phantom && (sniffed.phantom.keyName == dataPhantom || sniffed.phantom.valueName == dataPhantom)) break;
	        sniffed = sniffed.parentNode;
	    }
	    if (!sniffed || !sniffed.phantom) return result;

	    // now we can analyse it and turn it into the actual object path if needed
	    if (dataPhantom == sniffed.phantom.keyName) {
	    	result.resolved = sniffed.phantom.iterationKey;
	    }
	    else if (dataPhantom == sniffed.phantom.valueName) {
	        let cache = -1;
	        let name = '';
	        for (var key in sniffed.phantom.observers) {
	            let c = sniffed.phantom.observers[key].match(/\./g) ? sniffed.phantom.observers[key].match(/\./g).length : 0;
	            name = c > cache ? sniffed.phantom.observers[key] : name;
	            cache = c > cache ? c : cache;
	            result.observers.push(sniffed.phantom.observers[key]);
	        }
	        result.observers.push(name + '.' + sniffed.phantom.iterationKey);

			// get actual from initial phantom value
	        var propRes = PropertyResolver.toProperty(name + '.' + sniffed.phantom.iterationKey, object, node);
	        result.resolved = typeof propRes.resolved !== 'undefined' ? propRes.resolved : undefined;

			// now resolve property
	        if (propRes.observers.length > 0) for (var key2 in propRes.observers) if (result.observers.indexOf(propRes.observers[key2]) < 0) result.observers.push(propRes.observers[key2]);
	        if (dataPath.length > 0) result = PropertyResolver.toProperty(name + '.' + sniffed.phantom.iterationKey + dataPath, object, node);
	    }

	    return result;
	}
}
