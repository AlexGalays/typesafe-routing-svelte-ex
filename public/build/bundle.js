
(function(l, r) { if (l.getElementById('livereloadscript')) return; r = l.createElement('script'); r.async = 1; r.src = '//' + (window.location.host || 'localhost').split(':')[0] + ':35729/livereload.js?snipver=1'; r.id = 'livereloadscript'; l.getElementsByTagName('head')[0].appendChild(r) })(window.document);
var app = (function () {
    'use strict';

    function noop() { }
    function add_location(element, file, line, column, char) {
        element.__svelte_meta = {
            loc: { file, line, column, char }
        };
    }
    function run(fn) {
        return fn();
    }
    function blank_object() {
        return Object.create(null);
    }
    function run_all(fns) {
        fns.forEach(run);
    }
    function is_function(thing) {
        return typeof thing === 'function';
    }
    function safe_not_equal(a, b) {
        return a != a ? b == b : a !== b || ((a && typeof a === 'object') || typeof a === 'function');
    }
    function is_empty(obj) {
        return Object.keys(obj).length === 0;
    }
    function validate_store(store, name) {
        if (store != null && typeof store.subscribe !== 'function') {
            throw new Error(`'${name}' is not a store with a 'subscribe' method`);
        }
    }
    function subscribe(store, ...callbacks) {
        if (store == null) {
            return noop;
        }
        const unsub = store.subscribe(...callbacks);
        return unsub.unsubscribe ? () => unsub.unsubscribe() : unsub;
    }
    function component_subscribe(component, store, callback) {
        component.$$.on_destroy.push(subscribe(store, callback));
    }

    function append(target, node) {
        target.appendChild(node);
    }
    function insert(target, node, anchor) {
        target.insertBefore(node, anchor || null);
    }
    function detach(node) {
        node.parentNode.removeChild(node);
    }
    function element(name) {
        return document.createElement(name);
    }
    function text(data) {
        return document.createTextNode(data);
    }
    function space() {
        return text(' ');
    }
    function listen(node, event, handler, options) {
        node.addEventListener(event, handler, options);
        return () => node.removeEventListener(event, handler, options);
    }
    function attr(node, attribute, value) {
        if (value == null)
            node.removeAttribute(attribute);
        else if (node.getAttribute(attribute) !== value)
            node.setAttribute(attribute, value);
    }
    function children(element) {
        return Array.from(element.childNodes);
    }
    function custom_event(type, detail) {
        const e = document.createEvent('CustomEvent');
        e.initCustomEvent(type, false, false, detail);
        return e;
    }

    let current_component;
    function set_current_component(component) {
        current_component = component;
    }

    const dirty_components = [];
    const binding_callbacks = [];
    const render_callbacks = [];
    const flush_callbacks = [];
    const resolved_promise = Promise.resolve();
    let update_scheduled = false;
    function schedule_update() {
        if (!update_scheduled) {
            update_scheduled = true;
            resolved_promise.then(flush);
        }
    }
    function add_render_callback(fn) {
        render_callbacks.push(fn);
    }
    let flushing = false;
    const seen_callbacks = new Set();
    function flush() {
        if (flushing)
            return;
        flushing = true;
        do {
            // first, call beforeUpdate functions
            // and update components
            for (let i = 0; i < dirty_components.length; i += 1) {
                const component = dirty_components[i];
                set_current_component(component);
                update(component.$$);
            }
            set_current_component(null);
            dirty_components.length = 0;
            while (binding_callbacks.length)
                binding_callbacks.pop()();
            // then, once components are updated, call
            // afterUpdate functions. This may cause
            // subsequent updates...
            for (let i = 0; i < render_callbacks.length; i += 1) {
                const callback = render_callbacks[i];
                if (!seen_callbacks.has(callback)) {
                    // ...so guard against infinite loops
                    seen_callbacks.add(callback);
                    callback();
                }
            }
            render_callbacks.length = 0;
        } while (dirty_components.length);
        while (flush_callbacks.length) {
            flush_callbacks.pop()();
        }
        update_scheduled = false;
        flushing = false;
        seen_callbacks.clear();
    }
    function update($$) {
        if ($$.fragment !== null) {
            $$.update();
            run_all($$.before_update);
            const dirty = $$.dirty;
            $$.dirty = [-1];
            $$.fragment && $$.fragment.p($$.ctx, dirty);
            $$.after_update.forEach(add_render_callback);
        }
    }
    const outroing = new Set();
    let outros;
    function transition_in(block, local) {
        if (block && block.i) {
            outroing.delete(block);
            block.i(local);
        }
    }
    function transition_out(block, local, detach, callback) {
        if (block && block.o) {
            if (outroing.has(block))
                return;
            outroing.add(block);
            outros.c.push(() => {
                outroing.delete(block);
                if (callback) {
                    if (detach)
                        block.d(1);
                    callback();
                }
            });
            block.o(local);
        }
    }
    function create_component(block) {
        block && block.c();
    }
    function mount_component(component, target, anchor) {
        const { fragment, on_mount, on_destroy, after_update } = component.$$;
        fragment && fragment.m(target, anchor);
        // onMount happens before the initial afterUpdate
        add_render_callback(() => {
            const new_on_destroy = on_mount.map(run).filter(is_function);
            if (on_destroy) {
                on_destroy.push(...new_on_destroy);
            }
            else {
                // Edge case - component was destroyed immediately,
                // most likely as a result of a binding initialising
                run_all(new_on_destroy);
            }
            component.$$.on_mount = [];
        });
        after_update.forEach(add_render_callback);
    }
    function destroy_component(component, detaching) {
        const $$ = component.$$;
        if ($$.fragment !== null) {
            run_all($$.on_destroy);
            $$.fragment && $$.fragment.d(detaching);
            // TODO null out other refs, including component.$$ (but need to
            // preserve final state?)
            $$.on_destroy = $$.fragment = null;
            $$.ctx = [];
        }
    }
    function make_dirty(component, i) {
        if (component.$$.dirty[0] === -1) {
            dirty_components.push(component);
            schedule_update();
            component.$$.dirty.fill(0);
        }
        component.$$.dirty[(i / 31) | 0] |= (1 << (i % 31));
    }
    function init(component, options, instance, create_fragment, not_equal, props, dirty = [-1]) {
        const parent_component = current_component;
        set_current_component(component);
        const prop_values = options.props || {};
        const $$ = component.$$ = {
            fragment: null,
            ctx: null,
            // state
            props,
            update: noop,
            not_equal,
            bound: blank_object(),
            // lifecycle
            on_mount: [],
            on_destroy: [],
            before_update: [],
            after_update: [],
            context: new Map(parent_component ? parent_component.$$.context : []),
            // everything else
            callbacks: blank_object(),
            dirty,
            skip_bound: false
        };
        let ready = false;
        $$.ctx = instance
            ? instance(component, prop_values, (i, ret, ...rest) => {
                const value = rest.length ? rest[0] : ret;
                if ($$.ctx && not_equal($$.ctx[i], $$.ctx[i] = value)) {
                    if (!$$.skip_bound && $$.bound[i])
                        $$.bound[i](value);
                    if (ready)
                        make_dirty(component, i);
                }
                return ret;
            })
            : [];
        $$.update();
        ready = true;
        run_all($$.before_update);
        // `false` as a special case of no DOM component
        $$.fragment = create_fragment ? create_fragment($$.ctx) : false;
        if (options.target) {
            if (options.hydrate) {
                const nodes = children(options.target);
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.l(nodes);
                nodes.forEach(detach);
            }
            else {
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.c();
            }
            if (options.intro)
                transition_in(component.$$.fragment);
            mount_component(component, options.target, options.anchor);
            flush();
        }
        set_current_component(parent_component);
    }
    class SvelteComponent {
        $destroy() {
            destroy_component(this, 1);
            this.$destroy = noop;
        }
        $on(type, callback) {
            const callbacks = (this.$$.callbacks[type] || (this.$$.callbacks[type] = []));
            callbacks.push(callback);
            return () => {
                const index = callbacks.indexOf(callback);
                if (index !== -1)
                    callbacks.splice(index, 1);
            };
        }
        $set($$props) {
            if (this.$$set && !is_empty($$props)) {
                this.$$.skip_bound = true;
                this.$$set($$props);
                this.$$.skip_bound = false;
            }
        }
    }

    function dispatch_dev(type, detail) {
        document.dispatchEvent(custom_event(type, Object.assign({ version: '3.25.1' }, detail)));
    }
    function append_dev(target, node) {
        dispatch_dev("SvelteDOMInsert", { target, node });
        append(target, node);
    }
    function insert_dev(target, node, anchor) {
        dispatch_dev("SvelteDOMInsert", { target, node, anchor });
        insert(target, node, anchor);
    }
    function detach_dev(node) {
        dispatch_dev("SvelteDOMRemove", { node });
        detach(node);
    }
    function listen_dev(node, event, handler, options, has_prevent_default, has_stop_propagation) {
        const modifiers = options === true ? ["capture"] : options ? Array.from(Object.keys(options)) : [];
        if (has_prevent_default)
            modifiers.push('preventDefault');
        if (has_stop_propagation)
            modifiers.push('stopPropagation');
        dispatch_dev("SvelteDOMAddEventListener", { node, event, handler, modifiers });
        const dispose = listen(node, event, handler, options);
        return () => {
            dispatch_dev("SvelteDOMRemoveEventListener", { node, event, handler, modifiers });
            dispose();
        };
    }
    function attr_dev(node, attribute, value) {
        attr(node, attribute, value);
        if (value == null)
            dispatch_dev("SvelteDOMRemoveAttribute", { node, attribute });
        else
            dispatch_dev("SvelteDOMSetAttribute", { node, attribute, value });
    }
    function set_data_dev(text, data) {
        data = '' + data;
        if (text.wholeText === data)
            return;
        dispatch_dev("SvelteDOMSetData", { node: text, data });
        text.data = data;
    }
    function validate_slots(name, slot, keys) {
        for (const slot_key of Object.keys(slot)) {
            if (!~keys.indexOf(slot_key)) {
                console.warn(`<${name}> received an unexpected slot "${slot_key}".`);
            }
        }
    }
    class SvelteComponentDev extends SvelteComponent {
        constructor(options) {
            if (!options || (!options.target && !options.$$inline)) {
                throw new Error(`'target' is a required option`);
            }
            super();
        }
        $destroy() {
            super.$destroy();
            this.$destroy = () => {
                console.warn(`Component was already destroyed`); // eslint-disable-line no-console
            };
        }
        $capture_state() { }
        $inject_state() { }
    }

    //--------------------------------------
    //  Setup
    //--------------------------------------
    const validatorMethods = {
        map(fn) {
            return this.flatMap(v => Ok(fn(v)));
        },
        filter(fn) {
            return this.flatMap(v => fn(v) ? Ok(v) : Err(`filter error: ${pretty(v)}"`));
        },
        flatMap(fn) {
            return this.transform(r => isOk(r) ? fn(r.value) : r);
        },
        transform(fn) {
            const validator = this;
            return Object.assign({}, validatorMethods, {
                validate(v, config = defaultConfig, c = rootContext) {
                    const validated = validator.validate(v, config, c);
                    const transformed = fn(validated);
                    if (isOk(transformed))
                        return success(transformed.value);
                    const error = transformed.errors;
                    if (typeof error === 'string')
                        return failure(c, error);
                    return Err(error);
                }
            });
        },
        tagged() {
            return this;
        },
        optional() {
            return optional(this);
        }
    };
    function Ok(value) {
        return { type: 'ok', value };
    }
    function Err(errors) {
        return { type: 'error', errors };
    }
    function isOk(result) {
        return result.type === 'ok';
    }
    function success(value) {
        return Ok(value);
    }
    function failure(context, message) {
        return Err([{ context, message }]);
    }
    function typeFailure(value, context, expectedType) {
        const valueType = (() => {
            if (Array.isArray(value))
                return 'array';
            if (value === null)
                return 'null';
            return typeof value;
        })();
        const message = `Expected ${expectedType}, got ${valueType}`;
        return Err([{ context, message }]);
    }
    function getContext(name, parent) {
        return (parent ? `${parent} / ${name}` : name);
    }
    const rootContext = getContext('root');
    const defaultConfig = {};
    //--------------------------------------
    //  Primitives
    //--------------------------------------
    const nullValidator = Object.assign({ validate: (v, _config = defaultConfig, c = rootContext) => v === null ? success(v) : typeFailure(v, c, 'null') }, validatorMethods);
    const undefinedValidator = Object.assign({ validate: (v, _config = defaultConfig, c = rootContext) => v === void 0 ? success(v) : typeFailure(v, c, 'undefined') }, validatorMethods);
    const string = Object.assign({ validate: (v, _config = defaultConfig, c = rootContext) => typeof v === 'string' ? success(v) : typeFailure(v, c, 'string') }, validatorMethods);
    const number = Object.assign({ validate: (v, _config = defaultConfig, c = rootContext) => typeof v === 'number' ? success(v) : typeFailure(v, c, 'number') }, validatorMethods);
    const boolean = Object.assign({ validate: (v, _config = defaultConfig, c = rootContext) => typeof v === 'boolean' ? success(v) : typeFailure(v, c, 'boolean') }, validatorMethods);
    function object(props) {
        return Object.assign({ props, validate(v, config = defaultConfig, c = rootContext) {
                if (v == null || typeof v !== 'object')
                    return typeFailure(v, c, 'object');
                const validatedObject = {};
                const errors = [];
                for (let key in props) {
                    const transformedKey = config.transformObjectKeys !== undefined
                        ? config.transformObjectKeys(key)
                        : key;
                    const value = v[transformedKey];
                    const validator = props[key];
                    const validation = validator.validate(value, config, getContext(transformedKey, c));
                    if (isOk(validation)) {
                        if (validation.value !== undefined)
                            validatedObject[key] = validation.value;
                    }
                    else {
                        pushAll(errors, validation.errors);
                    }
                }
                return errors.length ? Err(errors) : Ok(validatedObject);
            } }, validatorMethods);
    }
    //--------------------------------------
    //  optional
    //--------------------------------------
    function optional(validator) {
        return Object.assign({ validate(v, config = defaultConfig, c = rootContext) {
                if (v === undefined)
                    return success(v);
                return validator.validate(v, config, c);
            } }, validatorMethods);
    }
    //--------------------------------------
    //  isoDate
    //--------------------------------------
    const isoDate = string.flatMap(str => {
        const date = new Date(str);
        return isNaN(date.getTime())
            ? Err(`Expected ISO date, got: ${pretty(str)}`)
            : Ok(date);
    });
    //--------------------------------------
    //  util
    //--------------------------------------
    function pushAll(xs, ys) {
        Array.prototype.push.apply(xs, ys);
    }
    function pretty(value) {
        return JSON.stringify(value, undefined, 2);
    }
    function errorDebugString(errors) {
        return errors.map(e => `At [${e.context}] ${e.message}`).join('\n');
    }

    function Route(name, path, params) {
        return { name, path, validator: object(params || {}) };
    }
    function Router(definitions, options) {
        const routes = definitions.reduce((acc, def) => {
            acc[def.name] = Object.assign(Object.assign({}, def), pathInfos(def.path));
            return acc;
        }, {});
        const notFound = { name: 'notFound', params: {} };
        let subs = [];
        let _route = notFound;
        setRouteFromHistory();
        addEventListener('popstate', setRouteFromHistory);
        function setRouteFromHistory() {
            const path = location.pathname;
            const search = location.search;
            for (const parsedRoute of Object.values(routes)) {
                const match = parsedRoute.pattern.exec(path);
                if (!match)
                    continue;
                const stringParams = parsedRoute.keys.reduce((params, key, index) => {
                    params[key] = match[index + 1];
                    return params;
                }, parseQueryParams(search.slice(1)));
                const validatedParams = parsedRoute.validator.validate(stringParams);
                if (validatedParams.type === 'error') {
                    return onRouteNotFound('route match but params error. ' +
                        errorDebugString(validatedParams.errors));
                }
                return (_route = {
                    name: parsedRoute.name,
                    params: validatedParams.value,
                });
            }
            onRouteNotFound('No match found');
        }
        const PARAMS = /:[^\\?\/]*/g;
        function link(routeName, params) {
            const routeToLink = routes[routeName];
            const path = routeToLink.path.replace(PARAMS, (p) => encodeURIComponent(params[p.substring(1)]));
            const query = Object.keys(params)
                .filter((p) => !routeToLink.keys.includes(p))
                .map((p) => `${p}=${encodeURIComponent(params[p])}`)
                .join('&');
            return path + (query.length ? `?${query}` : '');
        }
        const push = changeRoute(false);
        const replace = changeRoute(true);
        function changeRoute(replace) {
            return (routeName, params) => {
                const uri = link(routeName, params);
                if (replace)
                    history.replaceState(uri, '', uri);
                else
                    history.pushState(uri, '', uri);
                _route = {
                    name: routeName,
                    params,
                };
                fireOnChange();
            };
        }
        function onChange(callback) {
            subs.push(callback);
            return () => {
                subs.splice(subs.indexOf(callback), 1);
            };
        }
        function fireOnChange() {
            subs.forEach((fn) => fn());
        }
        function onRouteNotFound(reason) {
            // Set the route to notFound first, in case the onNotFound callback ends up redirecting to some other routes instead.
            _route = notFound;
            options.onNotFound(reason);
            // if no redirect occured then fire onChange, otherwise it already fired from push/replace.
            if (_route.name === 'notFound')
                fireOnChange();
        }
        return {
            get route() {
                return _route;
            },
            definitions,
            onChange,
            push,
            replace,
            link,
        };
    }
    // Extracts a simple chain like /path/:id to a regexp and the list of path keys it found.
    function pathInfos(str) {
        let tmp, keys = [], pattern = '', arr = str.split('/');
        arr[0] || arr.shift();
        while ((tmp = arr.shift())) {
            if (tmp[0] === ':') {
                keys.push(tmp.substring(1));
                pattern += '/([^/]+?)';
            }
            else {
                pattern += '/' + tmp;
            }
        }
        return {
            keys,
            pattern: new RegExp('^' + pattern + '/?$', 'i'),
        };
    }
    function parseQueryParams(query) {
        if (!query)
            return {};
        return query.split('&').reduce((res, paramValue) => {
            const [param, value] = paramValue.split('=');
            res[param] = decodeURIComponent(value);
            return res;
        }, {});
    }

    const subscriber_queue = [];
    /**
     * Creates a `Readable` store that allows reading by subscription.
     * @param value initial value
     * @param {StartStopNotifier}start start and stop notifications for subscriptions
     */
    function readable(value, start) {
        return {
            subscribe: writable(value, start).subscribe
        };
    }
    /**
     * Create a `Writable` store that allows both updating and reading by subscription.
     * @param {*=}value initial value
     * @param {StartStopNotifier=}start start and stop notifications for subscriptions
     */
    function writable(value, start = noop) {
        let stop;
        const subscribers = [];
        function set(new_value) {
            if (safe_not_equal(value, new_value)) {
                value = new_value;
                if (stop) { // store is ready
                    const run_queue = !subscriber_queue.length;
                    for (let i = 0; i < subscribers.length; i += 1) {
                        const s = subscribers[i];
                        s[1]();
                        subscriber_queue.push(s, value);
                    }
                    if (run_queue) {
                        for (let i = 0; i < subscriber_queue.length; i += 2) {
                            subscriber_queue[i][0](subscriber_queue[i + 1]);
                        }
                        subscriber_queue.length = 0;
                    }
                }
            }
        }
        function update(fn) {
            set(fn(value));
        }
        function subscribe(run, invalidate = noop) {
            const subscriber = [run, invalidate];
            subscribers.push(subscriber);
            if (subscribers.length === 1) {
                stop = start(set) || noop;
            }
            run(value);
            return () => {
                const index = subscribers.indexOf(subscriber);
                if (index !== -1) {
                    subscribers.splice(index, 1);
                }
                if (subscribers.length === 0) {
                    stop();
                    stop = null;
                }
            };
        }
        return { set, update, subscribe };
    }

    const userId = string.tagged();

    const router = Router([
        Route('index', '/'),
        Route('users', '/users'),
        Route('user', '/users/:id', { id: userId }),
    ], { onNotFound });
    const route = readable(router.route, (set) => {
        const stop = router.onChange(() => set(router.route));
        return stop;
    });
    function onNotFound(reason) {
        console.error(reason);
    }
    const simpleRoute = writable({ name: 'routeA', params: {} });

    /* src/Link.svelte generated by Svelte v3.25.1 */
    const file = "src/Link.svelte";

    function create_fragment(ctx) {
    	let a;
    	let t;
    	let mounted;
    	let dispose;

    	const block = {
    		c: function create() {
    			a = element("a");
    			t = text(/*text*/ ctx[0]);
    			attr_dev(a, "href", /*href*/ ctx[1]);
    			attr_dev(a, "class", "svelte-awth5c");
    			add_location(a, file, 32, 0, 893);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, a, anchor);
    			append_dev(a, t);

    			if (!mounted) {
    				dispose = [
    					listen_dev(a, "mousedown", /*onMouseDown*/ ctx[2], false, false, false),
    					listen_dev(a, "click", /*onClick*/ ctx[3], false, false, false)
    				];

    				mounted = true;
    			}
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*text*/ 1) set_data_dev(t, /*text*/ ctx[0]);
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(a);
    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("Link", slots, []);
    	
    	
    	let { route } = $$props;
    	let { text } = $$props;
    	const href = router.link(route[0], route[1] || {});
    	let preventClickDefault = false;

    	function onMouseDown(evt) {
    		const isModifiedEvent = Boolean(evt.metaKey || evt.altKey || evt.ctrlKey || evt.shiftKey);
    		const isSelfTarget = !evt.target || !evt.target.target || evt.target.target === "_self";

    		if (isSelfTarget && // Ignore everything but links with target self
    		evt.button === 0 && // ignore everything but left clicks
    		!isModifiedEvent) {
    			preventClickDefault = true; // ignore clicks with modifier keys
    			router.push(route[0], route[1] || {});
    		}
    	}

    	function onClick(evt) {
    		if (preventClickDefault) {
    			preventClickDefault = false;
    			evt.preventDefault();
    		}
    	}

    	const writable_props = ["route", "text"];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<Link> was created with unknown prop '${key}'`);
    	});

    	$$self.$$set = $$props => {
    		if ("route" in $$props) $$invalidate(4, route = $$props.route);
    		if ("text" in $$props) $$invalidate(0, text = $$props.text);
    	};

    	$$self.$capture_state = () => ({
    		router,
    		route,
    		text,
    		href,
    		preventClickDefault,
    		onMouseDown,
    		onClick
    	});

    	$$self.$inject_state = $$props => {
    		if ("route" in $$props) $$invalidate(4, route = $$props.route);
    		if ("text" in $$props) $$invalidate(0, text = $$props.text);
    		if ("preventClickDefault" in $$props) preventClickDefault = $$props.preventClickDefault;
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [text, href, onMouseDown, onClick, route];
    }

    class Link extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance, create_fragment, safe_not_equal, { route: 4, text: 0 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Link",
    			options,
    			id: create_fragment.name
    		});

    		const { ctx } = this.$$;
    		const props = options.props || {};

    		if (/*route*/ ctx[4] === undefined && !("route" in props)) {
    			console.warn("<Link> was created without expected prop 'route'");
    		}

    		if (/*text*/ ctx[0] === undefined && !("text" in props)) {
    			console.warn("<Link> was created without expected prop 'text'");
    		}
    	}

    	get route() {
    		throw new Error("<Link>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set route(value) {
    		throw new Error("<Link>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get text() {
    		throw new Error("<Link>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set text(value) {
    		throw new Error("<Link>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src/App.svelte generated by Svelte v3.25.1 */
    const file$1 = "src/App.svelte";

    // (46:43) 
    function create_if_block_2(ctx) {
    	let p;
    	let t0;
    	let t1_value = /*currentRoute*/ ctx[0].params.id + "";
    	let t1;

    	const block = {
    		c: function create() {
    			p = element("p");
    			t0 = text("User #");
    			t1 = text(t1_value);
    			add_location(p, file$1, 46, 6, 936);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, p, anchor);
    			append_dev(p, t0);
    			append_dev(p, t1);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*currentRoute*/ 1 && t1_value !== (t1_value = /*currentRoute*/ ctx[0].params.id + "")) set_data_dev(t1, t1_value);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(p);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_2.name,
    		type: "if",
    		source: "(46:43) ",
    		ctx
    	});

    	return block;
    }

    // (44:44) 
    function create_if_block_1(ctx) {
    	let p;

    	const block = {
    		c: function create() {
    			p = element("p");
    			p.textContent = "Users";
    			add_location(p, file$1, 44, 6, 873);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, p, anchor);
    		},
    		p: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(p);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_1.name,
    		type: "if",
    		source: "(44:44) ",
    		ctx
    	});

    	return block;
    }

    // (42:4) {#if currentRoute.name === 'index'}
    function create_if_block(ctx) {
    	let p;

    	const block = {
    		c: function create() {
    			p = element("p");
    			p.textContent = "Index";
    			add_location(p, file$1, 42, 6, 809);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, p, anchor);
    		},
    		p: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(p);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block.name,
    		type: "if",
    		source: "(42:4) {#if currentRoute.name === 'index'}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$1(ctx) {
    	let div;
    	let h1;
    	let t1;
    	let nav;
    	let link0;
    	let t2;
    	let link1;
    	let t3;
    	let link2;
    	let t4;
    	let main;
    	let current;

    	link0 = new Link({
    			props: { text: "Index", route: ["index"] },
    			$$inline: true
    		});

    	link1 = new Link({
    			props: { text: "Users", route: ["users"] },
    			$$inline: true
    		});

    	link2 = new Link({
    			props: {
    				text: "User",
    				route: ["user", { id: userId$1 }]
    			},
    			$$inline: true
    		});

    	function select_block_type(ctx, dirty) {
    		if (/*currentRoute*/ ctx[0].name === "index") return create_if_block;
    		if (/*currentRoute*/ ctx[0].name === "users") return create_if_block_1;
    		if (/*currentRoute*/ ctx[0].name === "user") return create_if_block_2;
    	}

    	let current_block_type = select_block_type(ctx);
    	let if_block = current_block_type && current_block_type(ctx);

    	const block = {
    		c: function create() {
    			div = element("div");
    			h1 = element("h1");
    			h1.textContent = "Routing example";
    			t1 = space();
    			nav = element("nav");
    			create_component(link0.$$.fragment);
    			t2 = space();
    			create_component(link1.$$.fragment);
    			t3 = space();
    			create_component(link2.$$.fragment);
    			t4 = space();
    			main = element("main");
    			if (if_block) if_block.c();
    			add_location(h1, file$1, 32, 2, 564);
    			attr_dev(nav, "class", "svelte-1tkw6pl");
    			add_location(nav, file$1, 34, 2, 592);
    			attr_dev(main, "class", "svelte-1tkw6pl");
    			add_location(main, file$1, 40, 2, 756);
    			attr_dev(div, "class", "app svelte-1tkw6pl");
    			add_location(div, file$1, 31, 0, 544);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			append_dev(div, h1);
    			append_dev(div, t1);
    			append_dev(div, nav);
    			mount_component(link0, nav, null);
    			append_dev(nav, t2);
    			mount_component(link1, nav, null);
    			append_dev(nav, t3);
    			mount_component(link2, nav, null);
    			append_dev(div, t4);
    			append_dev(div, main);
    			if (if_block) if_block.m(main, null);
    			current = true;
    		},
    		p: function update(ctx, [dirty]) {
    			if (current_block_type === (current_block_type = select_block_type(ctx)) && if_block) {
    				if_block.p(ctx, dirty);
    			} else {
    				if (if_block) if_block.d(1);
    				if_block = current_block_type && current_block_type(ctx);

    				if (if_block) {
    					if_block.c();
    					if_block.m(main, null);
    				}
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(link0.$$.fragment, local);
    			transition_in(link1.$$.fragment, local);
    			transition_in(link2.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(link0.$$.fragment, local);
    			transition_out(link1.$$.fragment, local);
    			transition_out(link2.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			destroy_component(link0);
    			destroy_component(link1);
    			destroy_component(link2);

    			if (if_block) {
    				if_block.d();
    			}
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$1.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    const userId$1 = "33";

    function instance$1($$self, $$props, $$invalidate) {
    	let $route;
    	validate_store(route, "route");
    	component_subscribe($$self, route, $$value => $$invalidate(1, $route = $$value));
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("App", slots, []);
    	
    	
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<App> was created with unknown prop '${key}'`);
    	});

    	$$self.$capture_state = () => ({
    		Link,
    		router,
    		route,
    		simpleRoute,
    		userId: userId$1,
    		currentRoute,
    		$route
    	});

    	$$self.$inject_state = $$props => {
    		if ("currentRoute" in $$props) $$invalidate(0, currentRoute = $$props.currentRoute);
    	};

    	let currentRoute;

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty & /*$route*/ 2) {
    			// https://github.com/sveltejs/language-tools/issues/493
    			 $$invalidate(0, currentRoute = $route);
    		}
    	};

    	return [currentRoute];
    }

    class App extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$1, create_fragment$1, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "App",
    			options,
    			id: create_fragment$1.name
    		});
    	}
    }

    const app = new App({
        target: document.body
    });

    return app;

}());
//# sourceMappingURL=bundle.js.map
