#!/usr/bin/python

import os
import time

import requests
from elasticsearch.helpers import bulk
from elasticsearch_dsl import DocType, String, Integer, Search, Index
from elasticsearch_dsl.query import MultiMatch
from elasticsearch_dsl.connections import connections

connections.create_connection(hosts=[os.environ['SEARCHBOX_SSL_URL']])


class Repo(DocType):
    description = String(analyzer='snowball')
    forks_count = Integer()
    full_name = String(analyzer='snowball')
    language = String(analyzer='snowball')
    stargazers_count = Integer()
    html_url = String()
    total_count = Integer()

    class Meta:
        index = 'xforhumans'

    @classmethod
    def from_json(cls, json):
        obj = cls(meta={"id": json['full_name']})
        obj['description'] = json['description']
        obj['forks_count'] = json['forks_count']
        obj['full_name'] = json['full_name']
        obj['language'] = json['language']
        obj['stargazers_count'] = json['stargazers_count']
        obj['html_url'] = json['html_url']
        obj['total_count'] = json['forks_count'] + json['stargazers_count']
        return obj


client = connections.get_connection()
index = Index('xforhumans')


def reindex():
    def _repos_from_response(items):
        for item in items:
            repo = Repo.from_json(item)
            yield repo.to_dict(include_meta=True)

    def _get_page(page=1):
        params = {
            'access_token': os.environ['GH_ACCESS_TOKEN'],
            'per_page': 100,
            'q': '"for humans"',
            'page': page,
        }
        resp = requests.get(
            'https://api.github.com/search/repositories',
            params=params,
        )
        print "Page {}, response: ".format(page, resp)
        return resp

    def _bulk_update(resp):
        result = bulk(client, _repos_from_response(resp.json()['items']))
        print "Bulk: ", result

    index.delete(ignore=404)
    index.create()

    first_resp = _get_page()
    _bulk_update(first_resp)

    n_pages = first_resp.json()['total_count']/100 + 1

    for page in range(2, n_pages + 1):
        time.sleep(1)
        resp = _get_page(page)
        _bulk_update(resp)


def search(query):
    search = Search(
        using=client,
        index=index._name,
    ).query(
        MultiMatch(
            query=query,
            fields=['description', 'full_name', 'language'],
            fuzziness='AUTO',
        ),
    )

    response = search.execute()

    for hit in response:
        print hit

reindex()
