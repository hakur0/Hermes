const AWS = require('aws-sdk');
const s3 = new AWS.S3();
const puppeteer = require('puppeteer');
const fs = require('fs');
const request = require('request-promise-native');

exports.handler = function (event, context, callback) {
	(async () => {
		const browser = await puppeteer.launch();
		const page = await browser.newPage();

		const url = 'http://pesquisa.doe.seplag.ce.gov.br/doepesquisa/sead.do?page=ultimasDetalhe&cmd=10&action=Cadernos&data=20180709';

		await page.goto(url);
		await page._client.send('Page.setDownloadBehavior', {
			behavior: 'allow',
			downloadPath: './'
		});

		const urls = await page.$$eval('a', anchors => {
			const list = [];

			for (let anchor of anchors) {
				list.push(anchor.href)
			}

			return list;
		});

		await browser.close();

		for (let url of urls) {
			const file = await request(url);
			const name = await url.replace(/^.*?([^\\\/]*)$/, '$1');

			s3.putObject({
				"Body": file,
				"Bucket": "elysium-hermes-test",
				"Key": name,
				"ACL": "public-read"
			})
				.promise()
				.then(data => {
					console.log(data);           // successful response
					/*
					data = {
						ETag: "\\"6805f2cfc46c0f04559748bb039d69ae\\"", 
						VersionId: "pSKidl4pHBiNwukdbcPXAIs.sshFFOc0"
					}
					*/
				})
				.catch(err => {
					console.log(err, err.stack); // an error occurred
				});
		}
	})();
}