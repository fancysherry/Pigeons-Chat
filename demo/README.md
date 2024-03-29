# CommonIO

## How It Organised

* API
  * HTTP
    * /avatar
    * /avatar/${USERNAME}
    * /upload
    * /uploads/${MD5}
  * IO
    * session C
    * register C/S
    * login C/S
    * contacts C/S
    * groups C/S
    * user.search C/S
    * contact.add C/S
    * profile.get C/S
    * profile.edit C/S

## How It Works

All operations require a session, if no sessionId provided, the server will create a new session and emit a `session` event to the client.

Generally, all data responded should contain a `err` property, error happens if the `err` is not `null`, and other data will not be available.

When a new event triggered, the callback will first it creates/gets a session from the `sessionId`, then check if the arguments match the requirement and finally starts to handle the event.

## HTTP API Reference

### POST /avatar

| Type   | Name      | Comment                                 |
| ------ | --------- | --------------------------------------- |
| string | sessionId |                                         |
| blob   | avatar    | The binary content of the avatar image. |

Be sure to use `Content-Type: multipart/form-data`, so that fields and files can both be received. And the server will return the final url to the avatar image.

### GET /avatar/${USERNAME}

An open access url for the avatar image of ${USERNAME}.

### POST /upload

| Type   | Name      | Comment                         |
| ------ | --------- | ------------------------------- |
| string | sessionId |                                 |
| blob   | file      | The binary content of the file. |

Be sure to use `Content-Type: multipart/form-data`, so that fields and files can both be received. And the server will return the final url to the file.

| Type   | Name     | Comment |
| ------ | -------- | ------- |
| string | err      |         |
| string | hash     |         |
| string | mimeType |         |

### GET /uploads/${MD5}

An open access url for the file of ${MD5}.

## IO API Reference

Client events must prepare to receive at least an `err` property, where error is indicated. Check `err` first before doing anything further.

### session on Client

| Type   | Name      | Comment |
| ------ | --------- | ------- |
| string | sessionId |         |

When a client connects and the server can't associate it with existing sessions, the server will emit a `session` event to inform new `sessionId`.

### register on Server

| Type   | Name      | Comment |
| ------ | --------- | ------- |
| string | sessionId |         |
| string | username  |         |
| string | password  |         |
| string | nickname  |         |

### register on Client

| Type   | Name | Comment |
| ------ | ---- | ------- |
| string | err  |         |

### login on Server

| Type   | Name      | Comment |
| ------ | --------- | ------- |
| string | sessionId |         |
| string | username  |         |
| string | password  |         |

### login on Client

| Type   | Name | Comment |
| ------ | ---- | ------- |
| string | err  |         |

### contacts on Client

| Type   | Name     | Comment |
| ------ | -------- | ------- |
| string | err      |         |
| user[] | contacts |         |

```
user {
   username: string,
   nickname: string, 
}
```

### groups on Client

| Type    | Name   | Comment |
| ------- | ------ | ------- |
| string  | err    |         |
| group[] | groups |         |

```
group {
   gid: number,
   groupname: string, 
}
```

### user.search on Server

| Type   | Name      | Comment |
| ------ | --------- | ------- |
| string | sessionId |         |
| string | pattern   |         |

### user.search on Client

| Type           | Name  | Comment                                  |
| -------------- | ----- | ---------------------------------------- |
| string         | err   |                                          |
| array of users | users | user { username, nickname, description } |

### contact.add on Server

| Type   | Name      | Comment |
| ------ | --------- | ------- |
| string | sessionId |         |
| string | username  |         |

### contact.add on Client

| Type   | Name | Comment |
| ------ | ---- | ------- |
| string | err  |         |

### group.add on Server

| Type     | Name      | Comment |
| -------- | --------- | ------- |
| string   | sessionId |         |
| string   | groupname |         |
| string[] | members   |         |

### group.add on Client

| Type     | Name           | Comment |
| -------- | -------------- | ------- |
| string   | err            |         |
| number   | gid            |         |
| string   | groupname      |         |
| string   | creator        |         |
| string[] | administrators |         |
| string[] | members        |         |

### group.join on Server

| Type   | Name      | Comment |
| ------ | --------- | ------- |
| string | sessionId |         |
| number | gid       |         |

### group.join on Client

| Type   | Name | Comment |
| ------ | ---- | ------- |
| string | err  |         |

### profile.get on Server

| Type   | Name      | Comment |
| ------ | --------- | ------- |
| string | sessionId |         |
| string | username  |         |

### profile.get on Client

| Type   | Name        | Comment |
| ------ | ----------- | ------- |
| string | err         |         |
| string | username    |         |
| string | nickname    |         |
| string | description |         |

### profile.edit on Server

| Type   | Name        | Comment |
| ------ | ----------- | ------- |
| string | sessionId   |         |
| string | nickname    |         |
| string | description |         |

### profile.edit on Client

| Type   | Name | Comment |
| ------ | ---- | ------- |
| string | err  |         |

### group.get on Server

| Type   | Name      | Comment |
| ------ | --------- | ------- |
| string | sessionId |         |
| number | gid   |         |

### group.get on Client

| Type   | Name             | Comment |
| ------ | ---------------- | ------- |
| string | err              |         |
| string | gid              |         |
| string | groupname        |         |
| string[] | administrators |         |
| string[] | members        |         |

### chat on Server

| Type   | Name      | Comment |
| ------ | --------- | ------- |
| string | sessionId |         |
| string | to        |         |
| string | message   |         |

The client emits this event when he sends message to other user.

### chat on Client

| Type   | Name | Comment |
| ------ | ---- | ------- |
| string | err  |         |

### group.chat on Server

| Type   | Name      | Comment |
| ------ | --------- | ------- |
| string | sessionId |         |
| number | gid       |         |
| string | message   |         |

The client emits this event when he sends message to other user.

### group.chat on Client

| Type   | Name | Comment |
| ------ | ---- | ------- |
| string | err  |         |

The client receives this event when someone sends message to him.

### message on Client

| Type   | Name    | Comment |
| ------ | ------- | ------- |
| string | err     |         |
| string | from    |         |
| string | message |         |

### group.message on Client

| Type   | Name    | Comment |
| ------ | ------- | ------- |
| string | err     |         |
| number | gid     |         |
| string | from    |         |
| string | message |         |

The client receives this event when group have messages.

## The MIT License

Copyright (c) 2015 evshiron

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.