"use strict"
/**@typedef {keyof HTMLElementTagNameMap} HTMLTag*/
/**@typedef {'save'|'rm-done'|'f'|'tbox'|'ls'} VALID_ID*/

// tasks aren't accessible-friendly
{
	/** ID of `<main>` container of task `<div>`s */
	const LS_NAME = "ls"

	const DONE_ENUM = Object.freeze({
		/** class name for tasks marked as "done" */
		CLASS: "done",
		/** char that encodes pending tasks */
		NO: "\x00",
		/** char that encodes done tasks */
		YES: "\x01",
		/**
		toggle button.
		should intuitively represent
		"stage for deletion" or
		"cross-out, but don't remove"
		*/
		ICON: "❎"
	})

	/**
	specialized Jquery (I'm allergic to libs)
	@param id {VALID_ID}
	*/
	const $ = id => /**@type {HTMLElement}*/(
		document.getElementById(id)
	)

	/**
	Moves the `value` attribute/property from the element
	@param t {HTMLInputElement}
	@return moved `value`
	*/
	const cut_input_value = t => {
		const v = t.value
		t.value = ""
		return v
	}

	/**
	Encode minimal data into an
	optimized non-modular non-extensible format
	@param {HTMLDivElement} task
	*/
	const task_serializer = task => /**@type {ChildNode}*/(task.firstChild).textContent + (
		task.classList.contains(DONE_ENUM.CLASS)
			? DONE_ENUM.YES : DONE_ENUM.NO
	)

	/**
	check if `c` is a code-unit that:
	- terminates the content of the output of `task_serializer`
	- encodes the "done-state" of a task
	@param {string} c
	*/
	const is_state_terminator = c => c === DONE_ENUM.NO || c === DONE_ENUM.YES

	const
		/** text-box within the form to input new tasks */
		tbox = /**@type {HTMLInputElement}*/(
			$("tbox")
		),
		/** `<main>` container of task `<div>`s */
		ls = $(LS_NAME),
		// reduce API calls
		/** list of task `<div>`s */
		ls_children = ls.children

	/**
	loads tasks from storage
	then parses them into the DOM.

	I defined this fn for self-documentation,
	and to encapsulate temporary vars.
	*/
	const ls_loader = () => {
		const serialized_tasks = localStorage.getItem(LS_NAME)
		if (!serialized_tasks) return

		const task_divs = []
		let start_i = 0
		// the encoding isn't Unicode-safe,
		// so we can't use the `String` iterator
		for (const [i, /**UTF-16 code-unit*/c] of serialized_tasks.split("").entries()) {
			// this branch can be skipped
			// by assuming the last `c` is a term.
			// but that would complicate the loader algorithm.
			if (!is_state_terminator(c)) continue

			const task = document.createElement("div")
			task_divs.push(task)
			task.textContent = serialized_tasks.slice(start_i, i)
			if (c == DONE_ENUM.YES)
				task.classList.add(DONE_ENUM.CLASS)

			const toggle_done = document.createElement("button")
			task.append(toggle_done)
			toggle_done.textContent = DONE_ENUM.ICON
			start_i = i + 1
		}

		// this may overflow the stack
		// if the user has too many tasks
		ls.append(...task_divs)
	}
	ls_loader()

	// delegation
	ls.addEventListener("click", e => {
		const t = e.target
		if (!(t instanceof HTMLButtonElement)) return
		/**@type {HTMLDivElement}*/(t.parentElement)
			.classList.toggle(DONE_ENUM.CLASS)
	});

	/**@type {HTMLFormElement}*/(
		$("f")
	).addEventListener("submit", e => {
		e.preventDefault()

		// avoid potential race-condition,
		// and reduce loop latency
		const txt = cut_input_value(tbox)

		// no need to copy,
		// because rm happens on last iter
		for (const t of ls_children)
			// `===` guarantees speed
			if (txt === /**@type {ChildNode}*/(t.firstChild).textContent) {
				// rm dupe
				ls.removeChild(t)
				// we can assume max 1 dupe
				break
			}

		const task = document.createElement("div")
		// recent tasks should be adjacent to form
		ls.prepend(task)
		task.textContent = txt

		const toggle_done = document.createElement("button")
		task.append(toggle_done)
		toggle_done.textContent = DONE_ENUM.ICON
	});

	/**@type {HTMLButtonElement}*/(
		$("save")
	).addEventListener("click", () => {
		// to-do: add toast as feedback
		try {
			const v =
				/**@type {HTMLDivElement[]}*/([...ls_children])
					.map(task_serializer).join("")
			localStorage.setItem(LS_NAME, v)
		} catch {
			alert("Failed to save. Check permissions and free storage space.")
		}
	});

	/**@type {HTMLButtonElement}*/(
		$("rm-done")
	).addEventListener("click", () =>
		// copy here, because each iter could update doc.
		// it's also convenient because `forEach`
		[...ls_children].forEach(t =>
			// minified `if`
			t.classList.contains(DONE_ENUM.CLASS) &&
			ls.removeChild(t)
		)
	)
}
