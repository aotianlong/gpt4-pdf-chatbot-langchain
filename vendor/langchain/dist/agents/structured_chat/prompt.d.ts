export declare const PREFIX = "Answer the following questions truthfully and as best you can.";
export declare const AGENT_ACTION_FORMAT_INSTRUCTIONS = "Output a JSON markdown code snippet containing a valid JSON blob (denoted below by $JSON_BLOB).\nThis $JSON_BLOB must have a \"action\" key (with the name of the tool to use) and an \"action_input\" key (tool input).\n\nValid \"action\" values: \"Final Answer\" (which you must use when giving your final response to the user), or one of [{tool_names}].\n\nThe $JSON_BLOB must be valid, parseable JSON and only contain a SINGLE action. Here is an example of an acceptable output:\n\n```json\n{{\n  \"action\": $TOOL_NAME\n  \"action_input\": $INPUT\n}}\n```\n\nRemember to include the surrounding markdown code snippet delimiters (begin with \"```\" json and close with \"```\")!\n";
export declare const FORMAT_INSTRUCTIONS: string;
export declare const SUFFIX = "Begin! Reminder to ALWAYS use the above format, and to use tools if appropriate.";
